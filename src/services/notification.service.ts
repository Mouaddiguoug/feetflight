import { initializeDbConnection } from '@/app';
import { uid } from 'uid';
import path from 'path';
import moment from 'moment';
import admin from "firebase-admin";
import {getMessaging} from "firebase-admin/messaging";
import Stripe from 'stripe';
import UserService from './users.service';

class NotificationService {
  private stripe = new Stripe(process.env.STRIPE_TEST_KEY, { apiVersion: '2022-11-15' });
  public userService = new UserService();

  public async getNotofications(userId: String) {
    const getNotoficationsSession = initializeDbConnection().session({ database: 'neo4j' });
    try {
      const notifications = await getNotoficationsSession.executeRead(tx =>
        tx.run(
          'match (notification:notification)<-[:got_notified]-(u:user {id: $userId}) return notification',
          {
            userId: userId
          }
        ),
      );

      notifications.records.map(record => {
        let days = moment().diff(record.get("notification").properties.time, "days");
        let hours = moment().diff(record.get("notification").properties.time, "hours");
        let minutes = moment().diff(record.get("notification").properties.time, "minutes");
        let seconds = moment().diff(record.get("notification").properties.time, "seconds");
        
        if(days == 0) {
          if(hours == 0) {
            if(minutes == 0) {
              if(seconds < 60) {
                record.get("notification").properties.time = `${seconds} seconds`;
              } else {
                record.get("notification").properties.time = `${minutes} minutes`;
              }
            } else if(minutes < 60 ) {
              record.get("notification").properties.time = `${minutes} minutes`;
            } else {
              record.get("notification").properties.time = `${hours} hours`;
            }
          } else if(hours < 24) {
            record.get("notification").properties.time = `${hours} hours`;
          } else {
            record.get("notification").properties.time = `${days} days`;
          }
        } else {
          record.get("notification").properties.time = `${days} days`;
        }
      })

      return notifications.records.map(record => record.get("notification").properties);
    } catch (error) {
      console.log(error);
    } finally {
      getNotoficationsSession.close();
    }
  }

  public async pushSellerNotificatons(sellerId: string, title: string, body: string) {
    const pushNotificatonsSession = initializeDbConnection().session({ database: 'neo4j' });
    const getTokensSession = initializeDbConnection().session({ database: 'neo4j' });

    try {
      const deviceToken = await getTokensSession.executeRead(tx =>
        tx.run(
          'match (seller {id: $sellerId})<-[:IS_A]-(user:user)-[:logged_in_with]->(deviceToken:deviceToken) return deviceToken',
          {
            sellerId: sellerId,
          },
        ),
      );
  
      console.log(deviceToken.records.map(record => record.get("deviceToken").properties.token)[0]);

      if(deviceToken.records.length > 0) {
        const message = {
          notification: {
            title: title,
            body: body
          },
          token: deviceToken.records.map(record => record.get("deviceToken").properties.token)[0]
        }
        
        getMessaging().send(message).then((res) => {
          console.log("successfully sent");
        }).catch((error) => {
          console.log(error);
        })
      }

    
      await pushNotificatonsSession.executeWrite(tx =>
        tx.run(
          'match (seller {id: $sellerId})<-[:IS_A]-(user:user) create (user)-[:got_notified]->(notification:notification {id: $notificationsId, title: $title, body: $body, time: $time}) return notification',
          {
            sellerId: sellerId,
            notificationsId: uid(10),
            title: title,
            body: body,
            time: moment().format('MMMM DD, YYYY, h:mm:ss a'),
          },
        ),
      );

    } catch (error) {
      console.log(error);
    } finally {
      pushNotificatonsSession.close();
    }
  }
}

export default NotificationService;
