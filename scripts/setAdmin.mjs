import { PrismaClient } from "../generated/prisma/client.js";

const prisma = new PrismaClient();

async function makeAdmin() {
  const result = await prisma.users.update({
    where: { username: "admin" },
    data: { isAdmin: true }
  });
  console.log("Admin updated:", result.username, "isAdmin:", result.isAdmin);
  await prisma.$disconnect();
}

makeAdmin();
