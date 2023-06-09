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
import { transporter } from '@/app';
import aws from 'aws-sdk';
import Stripe from 'stripe';

class AuthService {
  public users = userModel;

  public async signup(userData) {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');
    const stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });
    const signupSession = initializeDbConnection().session({ database: 'neo4j' });
    const createWalletSession = initializeDbConnection().session({ database: 'neo4j' });
    const email = userData.data.email;
    try {
      const findUser = await signupSession.executeRead(tx => tx.run('match (u:user {email: $email}) return u', { email: email }));
      if (findUser.records.length > 0) return { message: `This email ${userData.data.email} already exists` };
      const hashedPassword = await hash(userData.data.password, 10);
      if (!userData.data.role || !userData.data.name || !userData.data.userName || !userData.data.password) return { message: 'mlissing data' };
      switch (userData.data.role) {
        case RolesEnum.SELLER:
          if (!userData.data.subscriptionPrice || !userData.data.country || !userData.data.identityPhoto || !userData.data.city)
            return { message: 'data missing' };
          const seller = await stripe.customers.create({
            name: userData.data.name,
            email: email,
            address: {
              city: userData.data.city,
              country: userData.data.country,
            },
            balance: 0,
          });

          const createUserSeller = await signupSession.executeWrite(tx =>
            tx.run(
              'create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar, confirmed: false, desactivated: false, city: $city, country: $country})-[r: IS_A]->(s:seller {id: $sellerId, verified: $verified, identityPhoto: $identityPhoto, subscriptionPrice: $subscriptionPrice}) return u, s',
              {
                userId: seller.id,
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
                city: userData.data.city,
                country: userData.data.country,
              },
            ),
          );

          await createWalletSession.executeWrite(tx =>
            tx.run('match (s:seller {id: $sellerId}) create (s)-[:HAS_A]->(:wallet {id: $walletId, amount: 0})', {
              sellerId: createUserSeller.records.map(record => record.get('s').properties.id)[0],
              walletId: uid.uid(40),
            }),
          );

          const sellerToken = this.createToken(process.env.EMAIL_SECRET, createUserSeller.records.map(record => record.get('u').properties.id)[0]);

          this.sendVerificationEmail(email, userData.data.userName, sellerToken.token, 'selling');
          return { data: createUserSeller.records.map(record => record.get('u').properties) };
          break;
        case RolesEnum.BUYER:
          const buyer = await stripe.customers.create({
            name: userData.data.name,
            email: email,
            address: {
              city: userData.data.city,
              country: userData.data.country,
            },
            balance: 0,
          });

          const createdUserBuyer = await signupSession.executeWrite(tx =>
            tx.run(
              'create (u:user {id: $userId, name: $name, email: $email, userName: $userName, password: $password, createdAt: $createdAt, avatar: $avatar, confirmed: false})-[r: IS_A]->(b:buyer {id: $buyerId}) return u',
              {
                userId: buyer.id,
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

          const buyerToken = this.createToken(process.env.EMAIL_SECRET, createdUserBuyer.records.map(record => record.get('u').properties.id)[0]);
          this.sendVerificationEmail(email, userData.data.userName, buyerToken.token, 'finding');

          return { data: createdUserBuyer.records.map(record => record.get('u').properties)[0] };
          break;
      }
    } catch (error) {
      console.log(error);
    } finally {
      await signupSession.close();
      await createWalletSession.close();
    }
  }

  public async sendVerificationEmail(email: string, userName: string, token: string, role: string) {
    try {
      const mailOptions = {
        template: 'main',
        from: process.env.USER,
        to: email,
        subject: 'Verifying Email',
        context: {
          userName: userName,
          token: token,
          role: role,
        },
      };

      transporter.sendMail(mailOptions, (error: any, data: any) => {
        if (error) console.log(error);
        if (!error) console.log('sent');
      });
    } catch (error) {
      console.log(error);
    }
  }

  public async changePassword(userId, userData) {
    const changePasswordSession = initializeDbConnection().session();
    try {
      const hashedPassword = await hash(userData.data.password, 10);
      const changedPassword = await changePasswordSession.executeRead(tx =>
        tx.run('match (u {id: $userId}) set u.password = $newPassword return w', {
          userId: userId,
          newPassword: hashedPassword,
        }),
      );

      return changedPassword.records.map(record => record.get('u').properties)[0];
    } catch (error) {
      console.log(error);
    } finally {
      changePasswordSession.close();
    }
  }

  public async login(userData) {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');
    const loginSession = initializeDbConnection().session({ database: 'neo4j' });

    try {
      const email = userData.data.email;

      const findUser = await loginSession.executeRead(tx => tx.run('match (u:user {email: $email}) return u', { email: email }));
      if (findUser.records.length == 0) return { message: `password or email is incorrect` };

      /* if (!findUser.records.map(record => record.get('u').properties.confirmed)[0])
        return { message: `This email is not confirmed please confirm your email` }; */

      const password = findUser.records.map(record => record.get('u').properties.password)[0];
      const isPasswordMatching = await compare(userData.data.password, password);

      if (!isPasswordMatching) return { message: 'password or email is incorrect' };

      const tokenData = this.createToken(
        process.env.SECRET_KEY,
        findUser.records.map(record => record.get('u').properties.id),
      );

      return { tokenData, data: findUser.records.map(record => record.get('u').properties)[0] };
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

      return { refreshToken, data: findUser.records.map(record => record.get('u').properties) };
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

  public createToken(secret, data) {
    try {
      const dataStoredInToken = { data };
      const secretKey: string = secret;
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
