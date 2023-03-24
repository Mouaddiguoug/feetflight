import { hash } from 'bcrypt';
import { CreateUserDto } from '@dtos/users.dto';
import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import userModel from '@models/users.model';
import { isEmpty } from '@utils/util';
import { initializeDbConnection } from '@/app';
import { verify } from 'jsonwebtoken';
import Stripe from 'stripe';

class UserService {
  public users = userModel;

  public async findAllUser(): Promise<User[]> {
    const users: User[] = this.users;
    return users;
  }

  public async findUserById(userId) {
    const getUserSession = initializeDbConnection().session();
    try {
      const result = await getUserSession.executeRead(tx =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: userId,
        }),
      );

      if (!result.records.map(record => record.get('u').properties)) throw new HttpException(409, "User doesn't exist");

      return result.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      getUserSession.close();
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

  public async emailConfirming(token) {
    const confirmEmailSession = initializeDbConnection().session();
    try {
      const tokenData = verify(token, process.env.EMAIL_SECRET);

      const checkConfirmation = await confirmEmailSession.executeRead(tx =>
        tx.run('match (u:user {id: $userId}) return u', {
          userId: tokenData.data,
        }),
      );

      if (checkConfirmation.records.map(record => record.get('u').properties.confirmed)[0]) return 'this account is already confirmed';

      const confirmed = await confirmEmailSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) set u.confirmed = true return u', {
          userId: tokenData.data,
        }),
      );

      return confirmed.records.map(record => record.get('u').properties.confirmed)[0];
    } catch (error) {
      console.log(error);
    } finally {
      confirmEmailSession.close();
    }
  }

  public async updateUser(userId, userData): Promise<User[]> {
    const updateUserSession = initializeDbConnection().session();
    try {
      const existUser = await this.findUserById(userId);

      const updatedUser = await updateUserSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}) set u.name = $name, u.avatar = $avatar, u.username = $username,  return u', {
          userId: userId,
          name: userData.data.name ? userData.data.name : existUser.name,
          userName: userData.data.userName ? userData.data.userName : existUser.userName,
          avatar: userData.data.avatar ? userData.data.avatar : existUser.avatar,
        }),
      );

      return updatedUser.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      updateUserSession.close();
    }
  }

  public async buyPost(postId, userData): Promise<User[]> {
    const buyPostSession = initializeDbConnection().session();
    try {
      const boughtPost = await buyPostSession.executeWrite(tx =>
        tx.run('match (u:user {id: $userId}), (p:post {id: $postId}) create (u)-[bought:BOUGHT_A]->(p)', {
          userId: userData.data.id,
          postId: postId,
        }),
      );
      const stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });
      const boughtPostFromStripe = await stripe.checkout.sessions.create({
        success_url: "http://localhost:3000/signup",
        line_items: 
      })

      return boughtPost.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    }
  }

  public async desactivateUser(userId: number): Promise<User[]> {
    const desactivateUserSession = initializeDbConnection().session();
    try {
      const desactivatedUser = await desactivateUserSession.executeWrite(tx => tx.run('match (u:user {id: $userId}) set u.desactivated = true'));
      return desactivatedUser.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    }
  }
}

export default UserService;
