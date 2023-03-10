import { hash, compare } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { SECRET_KEY } from '@config';
import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import userModel from '@models/users.model';
import { isEmpty } from '@utils/util';
import { initializeDbConnection } from '@/app';
import { RolesEnum } from '../enums/RolesEnums';
import uid from 'uid';
import moment from 'moment';

class AuthService {
  public users = userModel;

  public async signup(userData) {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    const signupSession = initializeDbConnection().session({ database: 'neo4j' });
    const email = userData.data.email;
    try {
      const findUser = await signupSession.executeRead(tx => tx.run('match (u:user {email: $email}) return u', { email: email }));
      if (findUser.records.length > 0) return { message: `This email ${userData.data.email} already exists` };
      const hashedPassword = await hash(userData.data.password, 10);
      if (!userData.data.role || !userData.data.name || !userData.data.userName || !userData.data.password) return { message: 'mlissing data' };
      switch (userData.data.role) {
        case RolesEnum.SELLER:
          if (!userData.data.subscriptionPrice || !userData.data.identityPhoto) return { message: 'data missing' };

          const createUserSeller = await signupSession.executeWrite(tx =>
            tx.run(
              'create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar})-[r: IS_A]->(s:seller {id: $sellerId, verified: $verified, identityPhoto: $identityPhoto, subscriptionPrice: $subscriptionPrice}) return u',
              {
                userId: uid.uid(40),
                buyerId: uid.uid(40),
                createdAt: moment().format('MMMM DD, YYYY'),
                email: email,
                avatar: userData.data.avatar ? userData.data.avatar : '',
                userName: userData.data.userName,
                name: userData.data.name,
                password: hashedPassword,
                sellerId: uid.uid(40),
                identityPhoto: userData.data.identityPhoto,
                verified: false,
                subscriptionPrice: userData.data.subscriptionPrice,
              },
            ),
          );

          const sellerToken = this.createToken(createUserSeller.records.map(record => record.get('u').properties));
          return { data: createUserSeller.records.map(record => record.get('u').properties), sellerToken };
          break;
        case RolesEnum.BUYER:
          const createdUserBuyer = await signupSession.executeWrite(tx =>
            tx.run(
              'create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar})-[r: IS_A]->(b:buyer {id: $buyerId}) return u',
              {
                userId: uid.uid(40),
                buyerId: uid.uid(40),
                createdAt: moment().format('MMMM DD, YYYY'),
                email: email,
                avatar: userData.data.avatar ? userData.data.avatar : '',
                userName: userData.data.userName,
                name: userData.data.name,
                password: hashedPassword,
              },
            ),
          );
          const buyerToken = this.createToken(createdUserBuyer.records.map(record => record.get('u').properties.id));
          return { data: createdUserBuyer.records.map(record => record.get('u').properties), buyerToken };
          break;
      }
    } catch (error) {
      console.log(error);
    } finally {
      await signupSession.close();
    }
  }

  public async login(userData) {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');
    const loginSession = initializeDbConnection().session({ database: 'neo4j' });

    try {
      const email = userData.data.email;

      const findUser = await loginSession.executeRead(tx => tx.run('match (u:user {email: $email}) return u', { email: email }));
      if (findUser.records.length == 0) return { message: `This email ${userData.data.email} doesn't exists` };

      const password = findUser.records.map(record => record.get('u').properties.password)[0];
      const isPasswordMatching = await compare(userData.data.password, password);
      console.log(findUser);

      if (!isPasswordMatching) return { message: 'password or email is incorrect' };

      const tokenData = this.createToken(findUser.records.map(record => record.get('u').properties.id));

      return { tokenData, data: findUser.records.map(record => record.get('u').properties) };
    } catch (error) {
      console.log(error);
    } finally {
      loginSession.close();
    }
  }

  public async refreshToken(token) {
    if (!token) return { message: 'missing token' };
    const refreshSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const secretKey: string = SECRET_KEY;
      const decoded = verify(token, secretKey);

      const id: string = decoded.data[0];
      const findUser = await refreshSession.executeRead(tx => tx.run('match (u:user {id: $id}) return u', { id: id }));

      if (findUser.records.length == 0) return { message: 'refresh token is invalid' };

      const refreshToken = this.createRefreshToken(token);

      return { refreshToken };
    } catch (error) {
      console.log(error);
    } finally {
      refreshSession.close();
    }
  }

  public async logout(userData: User): Promise<User> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    const findUser: User = this.users.find(user => user.email === userData.email && user.password === userData.password);
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    return findUser;
  }

  public createToken(data) {
    try {
      const dataStoredInToken = { data };
      const secretKey: string = SECRET_KEY;
      const expiresIn: number = 60 * 60;

      return { token: sign(dataStoredInToken, secretKey, { expiresIn }) };
    } catch (error) {
      console.log(error);
    }
  }

  public createRefreshToken(data) {
    try {
      const dataStoredInToken = { data };
      const secretKey: string = SECRET_KEY;
      const expiresIn: string = '30 days';

      return { token: sign(dataStoredInToken, secretKey, { expiresIn }) };
    } catch (error) {
      console.log(error);
    }
  }

  public createCookie(tokenData): string {
    return `Authorization=${tokenData.token}; HttpOnly; Max-Age=${tokenData.expiresIn};`;
  }
}

export default AuthService;
