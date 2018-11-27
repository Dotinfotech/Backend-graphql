import { fromEvent } from 'graphcool-lib'

const userQuery = `
query UserQuery($userId: ID!) {
  User(id: $userId){
    id
    password
  }
}`

const getUser = async (api: any, userId: any) => {
  await api.request(userQuery, { userId })
    .then(userQueryResult => {
      let userQueryResultData = userQueryResult.User
      return userQueryResultData;
    })
    .catch(error => {
      console.log(`Error: ${JSON.stringify(error)}`)
      return { error: `An unexpected error occured` }
    })
}

export const loggedInUser = async (event) => {
  if (!event.context.auth || !event.context.auth.nodeId) {
    console.log(`No auth context`)
    let DataID = { data: { id: null } }
    return DataID;
  }

  const userId = event.context.auth.nodeId
  console.log(`Node ID: ${userId}`)

  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')

  return getUser(api, userId)
    .then((emailUser:any) => {
      if (!emailUser) {
        return { error: `No user with id: ${userId}` }
      }
      let DataEmaiUser = { data: emailUser }
      return DataEmaiUser;
    })
    .catch(error => {
      console.log(`Error: ${JSON.stringify(error)}`)
      return { error: `An unexpected error occured` }
    })

}