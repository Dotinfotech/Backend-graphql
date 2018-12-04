// Importing libraries
import { fromEvent } from 'graphcool-lib'
import * as bcrypt from 'bcryptjs'
import * as sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

// Environment Config
dotenv.config();

// SendGrid Environment Config
let sendKey: any = process.env.SENDGRID_API_KEY
sgMail.setApiKey(sendKey);

// Main Export Function 
const passwordResetToken = async (event: any) => {

    // Retrieve payload from event
    const resetToken = event.data.resetToken
    const email = event.data.email
    const newPassword = event.data.password

    // Graphcool-Lib Event and API  
    const graphcool = fromEvent(event)
    const api = graphcool.api('simple/v1')

    // BcryptSaltRounds
    const saltRounds = 10

    //new
    // const getUserWithEmail = async (email: any) => {
    //     return await api.request(`
    //     query {
    //       User(email: "${email}") {
    //         id
    //         password
    //       }
    //     }`)
    //         .then((userQueryResult: any) => {
    //             if (userQueryResult.error) {
    //                 return Promise.reject(userQueryResult.error)
    //             } else {
    //                 return userQueryResult.User
    //             }
    //         })
    // }

    // FetchUser Function with ResetToken
    const getUserWithToken = async (resetToken: any) => {
        return await api.request(`
         query {
            User(resetToken: "${resetToken}") {
                id
                resetExpires
            }
        }`)
            .then((userQueryResult: any) => {
                if (userQueryResult.error) {
                    return Promise.reject(userQueryResult.error)
                } else if (!userQueryResult.User || !userQueryResult.User.id || !userQueryResult.User.resetExpires) {
                    return Promise.reject('Not a valid token')
                } else {
                    return userQueryResult.User
                }
            })
    }

    // Update User Function for Password
    const updatePassword = async (id: any, newPasswordHash: any) => {
        return await api.request(`
         mutation {
            updateUser(
            id: "${id}",
            password: "${newPasswordHash}",
            resetToken: null,
            resetExpires: null
        ) {
            id
          }
      }`)
            .then((userMutationResult: any) => (userMutationResult.updateUser.id))
    }

    return await getUserWithToken(resetToken)
        .then((graphcoolUser: any) => {

            // Retrieve payload from graphcoolUser
            const userId = graphcoolUser.id
            const resetExpires = graphcoolUser.resetExpires
            const emailID = graphcoolUser.email
            console.log('EmailID ', emailID)

            // Checking for Token Expiration
            if (new Date() > new Date(resetExpires)) {
                return Promise.reject('Token expired.')
            } else {
                return bcrypt.hash(newPassword, saltRounds)
                    .then((hash: any) => updatePassword(userId, hash))
                    .then((id: any) => ({ data: { id: 'Password Changed Successfully' } }))
                    .catch((error: any) => ({ error: error.toString() }))
            }
        })
        // // Sending Mail confirmation for account reset password 
        // .then((graphcoolUser: any) => {
        //     const emailID = graphcoolUser.email
        //     console.log('emai id ', email)
        //     if (graphcoolUser) {
        //         const sendMail: any = {
        //             to: emailID,
        //             from: process.env.EMAIL_ID,
        //             subject: 'Account update',
        //             text: `This is a regarding for your account that password has been changed successfully.`
        //         };
        //         let reSend: any = sgMail.send(sendMail)
        //         return reSend
        //     } else {
        //         return Promise.reject('Email Already Sent')
        //     }
        // })
        .catch((error: any) => {
            console.log(error)
            return { error: 'An unexpected error occured.' }
        })
}
// Exporting Main Function
export default passwordResetToken;
