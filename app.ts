import * as Koa from 'koa';
import * as _ from 'lodash';
import { createWriteStream, createReadStream, unlink, renameSync } from 'fs';

const multer = require('koa-multer');
const router = require('koa-router');
const send = require('koa-send');

const upload = multer({ dest: 'uploads/' });
const tmp = multer({ dest: 'tmp/' });

const app = new Koa();
const port = 7003;

// response
app.use((ctx, next) => {
    if (ctx.path !== '/health') return next();
    ctx.body = 'ok';
});

app.use(router().get('/api/v3/file/:dir/:fileName', async (ctx, next) => {
    console.log('get');
    let dir = ctx.params.dir,
        fileName = ctx.params.fileName;
    await send(ctx, `${dir}/${fileName}`);
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

app.listen(port);

console.log(`app is listening on port ${port}.`);