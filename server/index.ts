import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { faker } from '@faker-js/faker'
import cors from "cors";
import { scheduleJob } from 'node-schedule';
import { PrismaClient, User } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient()

scheduleJob('0 * * * *', async function() {
  // now - (ms * s * mins * hours)
  let d = new Date(Date.now() - 1000 * 60 * 60 * 16)
  await prisma.room.deleteMany({
    where: {
      lastAccessed: {
        lte: d
      }
    }
  })
  await prisma.user.deleteMany({
    where: {
      lastAccessed : {
        lte: d
      }
    }
  })
})

async function isRoomInDB(roomName: string) {
  const room = await prisma.room.findUnique({
    where: {
      name: roomName
    }
  })
  if (room === null) return false
  return true
}

async function addRoomToDB(roomName: string) {
  await prisma.room.create({
    data: {
      name: roomName,
    }
  })
}

async function addUserToRoom(userName: string | User, roomName: string) {
  // may want to validate if a user exists here
  if (typeof userName === 'string') {
    await prisma.room.update({
      where: {
        name: roomName
      },
      data: {
        lastAccessed: new Date(),
        users: {
          create: {
            name: userName
          }
        }
      }, 
    })
  }
}

const port = process.env.PORT || 8080

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}))

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"]
  }
});

const roomIo = io.of("/api/room")
roomIo.on("connect", (socket) => {
    // validate room id on joining
    socket.on("ping", () => {
        console.log(`Received ping from ${socket.id}`)
        socket.emit("pong")
    })
    socket.on('join-room', async ({ roomName, username}, onError ) => {
      // TODO: Add error handling, e.g. if username already exist?
      const promises = []

      let validatedRoom: string
      let validatedUserName: string

      try {
        validatedRoom = z.string().parse(roomName.toLowerCase())
        validatedUserName = z.string().parse(username)
      } catch (err) {
        onError(JSON.stringify(err, Object.getOwnPropertyNames(err)))
        return
      }

      // Creates a user and adds them to a room
      const user = await prisma.user.findFirst({
        where: {
          name: validatedUserName
        }
      })

      if (!(await isRoomInDB(validatedRoom))) promises.push(addRoomToDB(validatedRoom))
      promises.push(addUserToRoom(user ?? validatedUserName, validatedRoom))
      promises.push(socket.join(validatedRoom))
      await Promise.allSettled(promises)

      socket.emit("Joined room", roomName)
      console.log(`${socket.id} join room: ${roomName}`)
 
    })
    console.log(socket.id)
    socket.on('update-state', (state) => {
        socket.broadcast.emit("update-state", state)
    })
});

app.get('/', (_req, res) => res.json({ message: "hello world" }))
app.post('/create-room', async (_req, res) => {
    function createRoom() {
        const words = faker.random.words(3)
        return words.toLowerCase().replace(/ /g, '-')
    }
    let room = createRoom()
    while (await isRoomInDB(room)) {
        room = createRoom()
    }
    await addRoomToDB(room)
    res.json({ room })
})

httpServer.listen(port, () => console.log(`Server is listening on port ${port}`));
