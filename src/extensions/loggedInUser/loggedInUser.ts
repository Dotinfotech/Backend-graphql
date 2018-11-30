import { fromEvent } from 'graphcool-lib'

const userQuery = `
query UserQuery($userId: ID!) {
  User(id: $userId){
    id
    password
  }
}`

const getUser = async (api: any, userId: any) => {
  return await api.request(userQuery, { userId })
    .then((userQueryResult: any) => {
      return userQueryResult.User
    })
    .catch((error: any) => {
      console.log(`Error: ${JSON.stringify(error)}`)
      return { error: `An unexpected error occured` }
    })
}

const loggedInUser = async (event: any) => {
  if (!event.context.auth || !event.context.auth.nodeId) {
    console.log(`No auth context`)
    return { data: { id: null } }
  }

  const userId = event.context.auth.nodeId
  console.log(`Node ID: ${userId}`)

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  return await getUser(api, userId)
    .then((emailUser: any) => {
      if (!emailUser) {
        return { error: `No user with id: ${userId}` }
      }
      return { data: emailUser }
    })
    .catch(error => {
      console.log(`Error: ${JSON.stringify(error)}`)
      return error
    })
}
export default loggedInUser;