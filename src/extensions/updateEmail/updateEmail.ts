// Importing libraries
import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'
import * as validator from 'validator'
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

// Environment Config
dotenv.config();

// SendGrid Environment Config
let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

// Main Export Function 
const updateEmail = async (event: any) => {

  // Retrieve payload from event
  const { email, password, newEmail } = event.data

  // Graphcool-Lib Event and API
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  // FetchUser Function with Email
  const getGraphcoolUser = async (email: any) => {
    return await api.request(`
    query {
      User(email: "${email}") {
        id
        password
      }
    }`)
      .then((userQueryResult: any) => {
        if (userQueryResult.error) {
          return Promise.reject(userQueryResult.error)
        } else {
          return userQueryResult.User

        }
      })
  }

  // Update User Function
  const updateGraphcoolUser = async (id: any, newEmail: any) => {
    return await api.request(`
      mutation {
        updateUser(
          id: "${id}",
          email: "${newEmail}"
        ) {
          id
        }
      }`)
      .then((userMutationResult: any) => {
        return userMutationResult.updateUser.id
      })
  }

  // Validating Email from graphcool database
  if (validator.isEmail(newEmail)) {
    return await getGraphcoolUser(email)
      .then((graphcoolUser: any) => {
        if (graphcoolUser === null) {
          return Promise.reject("User doesn't exists")
        } else {
          // Comparing Passwords
          return bcrypt.compare(password, graphcoolUser.password)
            .then((res: any) => {
              if (res == true) {
                return updateGraphcoolUser(graphcoolUser.id, newEmail)
              } else {
                return Promise.reject('Email or Password is wrong or User already exists with new email')
              }
            })
        }
      })
      // Sending Mail confirmation for account email updation 
      .then((graphcoolUser: any) => {
        if (graphcoolUser) {
          const sendMail: any = {
            to: email,
            from: process.env.EMAIL_ID,
            subject: 'Account update',
            text: `This is a regarding for your account that email has been updated.`
          };
          let reSend: any = sgMail.send(sendMail)
          return reSend
        } else {
          return Promise.reject('Email Already Sent')
        }
      })
      .then((id: any) => {
        let newid = { data: { id: 'Email Updated' } }
        return newid
      })
      .catch((error: any) => {
        console.log(`Error: ${JSON.stringify(error)}`)
        throw { error: 'An error occurred' }
      })
  } else {
    return { error: 'Not a valid email' }
  }
}
// Exporting Main Function
export default updateEmail;
