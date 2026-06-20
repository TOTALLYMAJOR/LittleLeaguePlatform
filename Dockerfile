FROM nginx:alpine

COPY index.html app.js styles.css /usr/share/nginx/html/

EXPOSE 80
