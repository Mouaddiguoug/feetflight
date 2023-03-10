import { hash } from 'bcrypt';
import { HttpException } from '@exceptions/HttpException';
import { isEmpty } from '@utils/util';
import { initializeDbConnection } from '@/app';
import { uid } from 'uid';

class walletService {
  public async createWallet(userId) {
    const createWalletSession = initializeDbConnection().session();
    try {
      const createdWellet = await createWalletSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) create (u)-[:HAS_A]->(w:wallet {id: walletId})', {
          walletId: uid(16),
          userId: userId,
        }),
      );

      return createdWellet;
    } catch (error) {
      console.log(error);
    } finally {
      createWalletSession.close();
    }
  }

  public async changePassword(email, userData) {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');
    const hashedPassword = await hash(userData.data.password, 10);
    const changePasswordSession = initializeDbConnection().session();
    try {
      const updatedUser = await changePasswordSession.executeWrite(tx =>
        tx.run('match (u:user {email: $email}) set u.password: $password return u', {
          email: email,
          password: hashedPassword,
        }),
      );
      if (!updatedUser.records.map(record => record.get('u').properties)) throw new HttpException(409, "User doesn't exist");
      return updatedUser.records.map(record => record.get('u').properties);
    } catch (error) {
      console.log(error);
    } finally {
      changePasswordSession.close();
    }
  }

  public async updateUser(userId: number, userData: CreateUserDto): Promise<User[]> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    const findUser: User = this.users.find(user => user.id === userId);
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    const hashedPassword = await hash(userData.password, 10);
    const updateUserData: User[] = this.users.map((user: User) => {
      if (user.id === findUser.id) user = { id: userId, ...userData, password: hashedPassword };
      return user;
    });

    return updateUserData;
  }

  public async deleteUser(userId: number): Promise<User[]> {
    const findUser: User = this.users.find(user => user.id === userId);
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    const deleteUserData: User[] = this.users.filter(user => user.id !== findUser.id);
    return deleteUserData;
  }
}

export default walletService;
