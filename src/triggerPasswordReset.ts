import { fromEvent } from 'graphcool-lib'
declare var crypto: any;

export = function (event: any) {
  const email = event.data.email
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  function generateResetToken() {
    //console.log('type: '+typeof(crypto.randombytes(20));
    return crypto.randomBytes(20).toString('hex')
  }

  function generateExpiryDate() {
    const now = new Date()
    return new Date(now.getTime() + 3600000).toISOString()
  }

  function getGraphcoolUser(email: any) {
    return api.request(`
    query {
      User(email: "${email}"){
        id
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

  function toggleReset(graphcoolUserId: any) {
    return api.request(`
      mutation {
        updateUser(
          id: "${graphcoolUserId}",
          resetToken: "${generateResetToken()}",
          resetExpires: "${generateExpiryDate()}"
        ) {
          id
        }
      }
    `)
  }

  return getGraphcoolUser(email)
    .then((graphcoolUser) => {
      if (graphcoolUser === null) {
        return Promise.reject('Invalid Credentials') // returning same generic error so user can't find out what emails are registered.
      } else {
        return toggleReset(graphcoolUser.id)
      }
    })
    .then((response: any) => {
      const id = response.updateUser.id
      return { data: { id } }
    })
    .catch((error: any) => {
      console.log(error)

      // don't expose error message to client!
      return { error: 'An unexpected error occured.' }
    })
}
