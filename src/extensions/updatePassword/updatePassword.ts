import { fromEvent } from "graphcool-lib";
import * as bcrypt from "bcryptjs";
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

dotenv.config();

let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);


const updatePassword = async (event: any) => {
  const { email, password, newPassword } = event.data;

  const graphcool = fromEvent(event);
  const api = graphcool.api("simple/v1");

  const saltRounds = 10;

  const getGraphcoolUser = async (email: any) => {
    return await api.request(`
    query {
      User(email: "${email}"){
        id
        password
      }
    }`
    )
      .then((userQueryResult: any) => {
        if (userQueryResult.error) {
          return Promise.reject(userQueryResult.error);
        } else {
          return userQueryResult.User;
        }
      });
  };

  const updateGraphcoolUser = async (id: any, newPasswordHash: any) => {
    return await api.request(
      `
      mutation {
        updateUser(
          id:"${id}",
          password:"${newPasswordHash}"
        ){
          id
        }
      }`
    )
      .then((userMutationResult: any) => {
       return userMutationResult.updateUser.id;
      });
  };

  return await getGraphcoolUser(email)
    .then((graphcoolUser: any) => {
      if (graphcoolUser === null) {
        return Promise.reject("Invalid Credentials");
      } else {
        return bcrypt.compare(password, graphcoolUser.password).then(res => {
          if (res == true) {
            return bcrypt
              .hash(newPassword, saltRounds)
              .then(hash => updateGraphcoolUser(graphcoolUser.id, hash));
          } else {
            return Promise.reject("Invalid Credentials");
          }
        });
      }
    })
    .then(id => {
     return { data: { id } };
    })
    .then((graphcoolUser: any) => {
      if (graphcoolUser) {
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Account update',
          text: `This is a regarding for your account that password has been updated.`
        };
        let reSend: any = sgMail.send(sendMail)
        return reSend
      } else {
        return Promise.reject('Invalid Credentials')
      }
    })
    .catch(error => {
      console.log(error);
      return error
    });
};

export default updatePassword;
