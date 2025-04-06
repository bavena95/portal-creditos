// lib/prisma.js
import { PrismaClient } from '@prisma/client';

// Declara uma variável global para armazenar o cliente Prisma
let prisma;

// Verifica se estamos em produção ou desenvolvimento
if (process.env.NODE_ENV === 'production') {
  // Em produção, cria uma única instância
  prisma = new PrismaClient();
} else {
  // Em desenvolvimento, evita criar múltiplas instâncias devido ao hot-reloading do Next.js
  // Reutiliza a instância existente ou cria uma nova se não existir
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

// Exporta a instância única do Prisma Client
export default prisma;