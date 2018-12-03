// Importing libraries
import { fromEvent } from "graphcool-lib";
import * as bcrypt from "bcryptjs";
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

// Environment Config
dotenv.config();

// SendGrid Environment Config
let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

// Main Export Function 
const updatePassword = async (event: any) => {

  // Retrieve payload from event
  const { email, password, newPassword } = event.data;

  // Graphcool-Lib Event and API  
  const graphcool = fromEvent(event);
  const api = graphcool.api("simple/v1");

  // Salt Rounds
  const saltRounds = 10;

  // FetchUser Function with Email
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

  // Update User Function for Password
  const updateGraphcoolUser = async (id: any, newPasswordHash: any) => {
    return await api.request(
      `mutation {
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
    .then((id: any) => {
      let DataID = { data: { id } }
      return DataID
    })
    // Sending Mail confirmation for account password updation 
    .then(() => {
      try {
        const sendMail: any = {
          to: email,
          from: process.env.EMAIL_ID,
          subject: 'Account update',
          text: `This is a regarding for your account that password has been updated.`
        };
        let reSend: any = sgMail.send(sendMail)
        return reSend
      }
      finally {
        console.log('Mail Sent')
      }
    })
    .catch((error: any) => {
      console.log(`Error: ${JSON.stringify(error)}`)
      throw { error: 'An error occurred' }
    });
};

// Exporting Main Function
export default updatePassword;
