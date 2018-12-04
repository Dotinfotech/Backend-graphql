// Importing libraries
import { fromEvent } from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'
import * as validator from 'validator'
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

// Environment Config
dotenv.config();

// SendGrid Environment Config
let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

// UserQuery for Email
const userQuery = `
query UserQuery($email: String!) {
  User(email: $email){
    id
    password
  }
}`

// NewUser Mutation for Email, Password
const createUserMutation = `
mutation CreateUserMutation($email: String!, $passwordHash: String!) {
  createUser(
    email: $email,
    password: $passwordHash,
  ) {
    id
  }
}`

// CreateUser Function with Emaill, Password
const createGraphcoolUser = async (api: any, email: any, passwordHash: any) => {
  return await api.request(createUserMutation, { email, passwordHash })
    .then((userMutationResult: any) => {
      return userMutationResult.createUser.id
    })
}

// FetchUser Function with Email
const getGraphcoolUser = async (api: any, email: any) => {
  return await api.request(userQuery, { email }).then((userQueryResult: any) => {
    if (userQueryResult.error) {
      return Promise.reject(userQueryResult.error)
    } else {
      return userQueryResult.User
    }
  })
}

// Main Export Function
const signup = async (event: any) => {
  // Validating Root Token
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Signup not configured correctly.' }
  }

  // Retrieve payload from event
  const { email, password } = event.data

  // Graphcool-Lib Event and API
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  // Generate salt
  const SALT_ROUNDS = 10
  const salt = bcryptjs.genSaltSync(SALT_ROUNDS)

  // Validating Email from graphcool database
  if (validator.isEmail(email)) {
    return await getGraphcoolUser(api, email)
      .then((graphcoolUser: any) => {
        if (!graphcoolUser) {
          return bcryptjs.hash(password, salt)
            .then((hash: any) => createGraphcoolUser(api, email, hash))
        } else {
          return Promise.reject('EmailID is already in use')
        }
      })
      // Sending Mail confirmation for account creation 
      .then((graphcoolUser: any) => {
        if (graphcoolUser === null) {
          return Promise.reject('User doesnt exits')
        } else {
          const sendMail: any = {
            to: email,
            from: process.env.EMAIL_ID,
            subject: 'Account Creation',
            text: `This is a confirmation for your account has just been created.`
          };
          let reSend: any = sgMail.send(sendMail)
          return reSend
        }
      })
      .then((graphcoolUserId: any) => {
        return graphcool.generateAuthToken(graphcoolUserId, 'User')
          .then((token: any) => {
            let tokenData = { data: { token: token } }
            console.log('Token data', tokenData)
            return tokenData
          })
      })
      .catch((error: any) => {
        console.log(`Error: ${JSON.stringify(error)}`)
        throw { error: 'An error occurred' }
      })
  } else {
    throw new Error('Not a valid email')
  }
}
// Exporting Main Function
export default signup;

