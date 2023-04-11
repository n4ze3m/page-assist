import {NextApiRequest, NextApiResponse} from 'next'
import { prisma } from '~/server/db'


export default async (req: NextApiRequest, res: NextApiResponse) => {
    const {token } = req.body

    if(!token) {
        return res.status(400).json({error: 'Token is required'})
    }

    const isUserExist = await prisma.user.findFirst({
        where: {
            access_token: token
        }
    })

    if(!isUserExist) {
        return res.status(400).json({error: 'Invalid token'})
    }

    return res.status(200).json({message: 'Token is valid'})
}