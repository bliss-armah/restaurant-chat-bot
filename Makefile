# Prisma
db-push:
	npx prisma db push

migrate:
	npx prisma migrate dev --name $(name)

migrate-reset:
	npx prisma migrate reset

generate:
	npx prisma generate

studio:
	npx prisma studio

# Dev
dev:
	npm run dev