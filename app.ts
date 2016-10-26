import * as Koa from 'koa';
import * as _ from 'lodash';
import { createWriteStream, createReadStream, unlink, renameSync, readdirSync, readFileSync } from 'fs';

const multer = require('koa-multer');
const router = require('koa-router');
const send = require('koa-send');
const Convert = require('koa-convert');
const JSZip = require('jszip');

const upload = multer({ dest: 'uploads/' });
const tmp = multer({ dest: 'tmp/' });

const app = new Koa();
const port = process.env.PORT || 8080;

const CORSConfig = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}

// response
app.use(Convert(require('koa-cors')(CORSConfig)));

app.use((ctx, next) => {
    if (ctx.path !== '/health') return next();
    ctx.body = 'ok';
});

app.use(router().get('/api/v3/file/:dir/:fileName', async (ctx, next) => {
    console.log('get');
    let dir = ctx.params.dir,
        fileName = ctx.params.fileName;
    ctx.set('Content-Disposition', `attachment; filename*= UTF-8''${encodeURIComponent(fileName)}`);
    await send(ctx, `${dir}/${fileName}`);
}).routes());

// GET /api/v3/file/uploads?file=1.json&file=2.json HTTP/1.1
// Accept: application/zip
app.use(router().get('/api/v3/file/:dir', async (ctx, next) => {
    if (ctx.get('Accept') !== 'application/zip') return await next();
    let dir = ctx.params.dir === 'upload' ? 'uploads' : 'tmp';
    let fileNames = ctx.query.fileNames;
    let zip = fileNames.reduce((zip, fileName) => zip.file(fileName, readFileSync(`uploads/${fileName}`)), new JSZip());

    ctx.set('Content-Disposition', `attachment; filename*= UTF-8''${encodeURIComponent('Archive.zip')}`);
    ctx.body = zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true });
}).routes());

app.use(router().post('/api/v3/file/:dir', async (ctx, next) => {
    console.log('here');
    let dir = ctx.params.dir === 'upload' ? 'uploads' : 'tmp';
    let fileName = ctx.query.fileName;

    if (dir === 'tmp') await tmp.single('file')(ctx, next);
    else await upload.single('file')(ctx, next);

    if (!_.isEmpty(fileName)) renameSync(ctx.req.file.path, `${dir}/${fileName}`);

    fileName = fileName || ctx.req.file.filename;
    let path = `${dir}/${fileName}`;
    let url = `/api/v3/file/${path}`;

    ctx.body = {
        fileName,
        mimeType: ctx.req.file.mimetype,
        originalName: ctx.req.file.originalname,
        size: ctx.req.file.size,
        url
    };

    if (dir === 'tmp') setTimeout(() => unlink(path), 1000 * 60 * 1);
}).routes());

app.use(router().delete('/api/v3/file/:dir', async (ctx, next) => {
    console.log('delete');
    let dir = ctx.params.dir,
        fileName = ctx.query.fileName;
    await unlink(`${dir}/${fileName}`);
    ctx.body = 'success';
}).routes());

app.use(router().get('/api/v3/file/check/:dir/:fileName', async (ctx, next) => {
    console.log('check file');
    let dir = ctx.params.dir,
        fileName = ctx.params.fileName,
        isExist = false,
        filenames = readdirSync(`${dir}`);
    ctx.set('Content-Disposition', `attachment; filename*= UTF-8''${encodeURIComponent(fileName)}`);

    filenames.forEach(filename => {
        if (filename === fileName) isExist = true;
    });

    ctx.body = isExist;
}).routes());

app.listen(port);

console.log(`app is listening on port ${port}.`);