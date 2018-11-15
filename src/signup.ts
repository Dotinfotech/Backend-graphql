import {fromEvent}  from 'graphcool-lib'
import * as bcryptjs from 'bcryptjs'
import * as validator from 'validator'

const userQuery = `
query UserQuery($email: String!) {
  User(email: $email){
    id
    password
  }
}`

const createUserMutation = `
mutation CreateUserMutation($email: String!, $passwordHash: String!) {
  createUser(
    email: $email,
    password: $passwordHash
  ) {
    id
  }
}`

const getGraphcoolUser = (api: any, email: any) => {
  return api.request(userQuery, { email })
    .then(userQueryResult => {
      if (userQueryResult.error) {
        return Promise.reject(userQueryResult.error)
      } else {
        return userQueryResult.User
      }
    })
}

const createGraphcoolUser = (api: any, email: any, passwordHash:any) => {
  return api.request(createUserMutation, { email, passwordHash })
    .then(userMutationResult => {
      return userMutationResult.createUser.id
    })
}

export = function(event:any) {
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'Email Signup not configured correctly.'}
  }

  // Retrieve payload from event
  const email = event.data.email
  const password = event.data.password

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  const SALT_ROUNDS = 10
  const salt = bcryptjs.genSaltSync(SALT_ROUNDS);

  if (validator.isEmail(email)) {
    return getGraphcoolUser(api, email)
      .then(graphcoolUser => {
        if (!graphcoolUser) {
          return bcryptjs.hash(password, salt)
            .then(hash => createGraphcoolUser(api, email, hash))
        } else {
          return Promise.reject('Email already in use')
        }
      })
      .then(graphcoolUserId => {
        return graphcool.generateAuthToken(graphcoolUserId, 'User')
          .then(token => {
            return { data: {id: graphcoolUserId, token}}
        })
      })
      .catch(error => {
        console.log(`Error: ${JSON.stringify(error)}`)
        return { error: 'An unexpected error occured.' }
      })
  } else {
    return { error: 'Not a valid email' }
  }
}
