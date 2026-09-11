CREATE TYPE "public"."tipo_hogar" AS ENUM('casa', 'grupo');--> statement-breakpoint
ALTER TABLE "hogares" ADD COLUMN "tipo" "tipo_hogar" DEFAULT 'casa' NOT NULL;