import BaseService from './BaseService.js';

class UserService extends BaseService {

  async register(email, username, password) {
    if (!email || !username || !password) {
      throw new Error("Email, username, dan password wajib diisi");
    }
    if (password.length < 6) {
      throw new Error("Password minimal 6 karakter");
    }

    const existingUser = await this.prisma.users.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existingUser) {
      if (existingUser.email === email) throw new Error("Email sudah digunakan");
      if (existingUser.username === username) throw new Error("Username sudah digunakan");
    }

    const joinDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    return await this.prisma.users.create({
      data: { email, username, password, joinDate, createdAt: new Date() }
    });
  }

  async login(username, password) {
    if (!username || !password) {
      throw new Error("Username/Email dan Password wajib diisi");
    }

    const user = await this.prisma.users.findFirst({
      where: { OR: [{ email: username }, { username: username }] }
    });

    if (!user) throw new Error("Username/Email tidak ditemukan");
    if (user.password !== password) throw new Error("Password salah");

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar ? `/api/avatar/${user.id}` : "/asset/profile.png",
      level: user.level || 1,
      joinDate: user.joinDate || new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }),
      birthday: user.birthday || "-",
      gender: user.gender || "-"
    };
  }

  async getAllUsers() {
    const users = await this.prisma.users.findMany({
      select: { id: true, email: true, username: true, joinDate: true, birthday: true, gender: true, avatar: true, createdAt: true }
    });
    return users.map(user => ({
      ...user,
      avatar: user.avatar ? `/api/avatar/${user.id}` : null
    }));
  }

  async updateProfile(userId, { username, email, password, birthday, gender }) {
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (gender !== undefined) updateData.gender = gender;

    return await this.prisma.users.update({
      where: { id: userId },
      data: updateData
    });
  }

  async uploadAvatar(userId, buffer) {
    await this.prisma.users.update({
      where: { id: userId },
      data: { avatar: buffer }
    });
  }

  async getAvatar(userId) {
    return await this.prisma.users.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });
  }

  async getPoints(userId) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { points: true }
    });
    if (!user) throw new Error("User tidak ditemukan");
    return user.points;
  }

  async deleteUser(userId) {
    return await this.prisma.users.delete({ where: { id: userId } });
  }
}

export default UserService;
