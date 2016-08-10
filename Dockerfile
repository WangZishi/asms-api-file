# Version: 1.0.0.dev
FROM node:6.3.0
MAINTAINER Wang Zishi <ynh.2@outlook.com>
WORKDIR /usr/src

ENTRYPOINT ["npm", "run"]
CMD ["start"]
