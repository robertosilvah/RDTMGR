Se asume un nombre de usuario `antares` y que el servidor de MariaDB está instalado. Ésta no es una guía de actualización.

1. Extraer el contenido del archivo `deploy.zip` a la carpeta `~/rdt_pms` e ingresar a la misma:

	```sh
	# En caso de una actualización, eliminamos carpetas antiguas
	rm -rf ~/rdt-pms
	rm -rf ~/rdt_pms
	# Descomprimimos el archivo
	unzip deploy.zip -d ~/rdt_pms
	# Cambiamos de directorio
	cd ~/rdt_pms
	```

1. Crear la base de datos:

	```sql
	sudo mysql
	create database rdt_pms;
	create user 'antares'@'localhost' identified by 'password';
	grant all privileges on rdt_pms.* to 'antares'@'localhost';
	flush privileges;
	quit;
	```

1. Importar las tablas a la base de datos:

	```
	sudo mysql rdt_pms < sql/rdt_pms.sql
	```

1. En una copia `.env` del archivo `.env.default`, cambiar las variables `DB_USER` y `DB_PASS` del archivo por el usuario y contraseña utilizados en el paso 3:

	```
	nano .env
	# Ctrl+X para cerrar (pide confirmación si el archivo fue modificado)
	```

1. Copiar, habilitar e iniciar el servicio mediante systemd (para que inicie automáticamente incluso en caso de caídas):

	```
	sudo cp ./rdt_pms.service /etc/systemd/system/
	sudo systemctl enable rdt_pms
	sudo systemctl start rdt_pms
	```

1. El servicio genera un log.txt en la carpeta `~/rdt_pms`. También se puede comprobar que el servicio esté en ejecución con:

	```
	sudo systemctl status rdt_pms
	```

1. Comprobar que la aplicación se puede utilizar ingresando a [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Configurar redirección utilizando NGINX

1. Copiar y abrir el archivo `/etc/nginx/sites-available/default`:

	```sh
	sudo cp /etc/nginx/sites-available/default ~/nginx
	sudo nano ~/nginx
	```

1. Agregar los siguientes bloques `location` luego de los otros en el mismo archivo:

	```nginx
    location /rdt-pms {
        alias /home/antares/rdt_pms/public;
        try_files $uri $uri/ index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # proxy_set_header X-Real-IP $remote_addr;
    }
	```

1. Reiniciar el servicio de NGINX:
	```sh
	sudo systemctl restart nginx
	```

1. Comprobar que la aplicación se puede utilizar ingresando a [http://127.0.0.1/rdt-pms](http://127.0.0.1/rdt-pms).