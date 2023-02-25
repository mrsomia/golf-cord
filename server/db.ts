import { Prisma, PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient()

export async function deleteStaleDBItems () {
    
  console.log("Deleting old users")
  // now - (ms * s * mins * hours)
  let d = new Date(Date.now() - 1000 * 60 * 60 * 16)
  await prisma.user.deleteMany({
    where: {
      lastAccessed : {
        lte: d
      }
    }
  })
  console.log("Deleting old rooms")
  await prisma.room.deleteMany({
    where: {
      lastAccessed: {
        lte: d
      }
    }
  })
}

export async function isRoomInDB(roomName: string) {
  const room = await prisma.room.findUnique({
    where: {
      name: roomName
    }
  })
  if (room === null) return false
  return true
}


export async function addRoomToDB(roomName: string) {
  await prisma.room.create({
    data: {
      name: roomName,
    }
  })
}

export async function addUserToRoom(userName: string | User, roomName: string) {
  // may want to validate if a user exists here
  if (typeof userName === 'string') {
    const room = await prisma.room.update({
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
      include: {
        holes: true,
        users : {
          where: {
            name: {
              equals: userName,
            }
          }
        }
      }
    })

    let userScores: Prisma.UserScoreCreateManyInput[] = []

    for (const user of room.users) {
      for (const hole of room.holes) {
        userScores.push({
          userId: user.id,
          holeId: hole.id,
        })
      }
    }

    const { count } = await prisma.userScore.createMany({
      data: userScores
    })

    if (count !== room.holes.length) {
      console.error(`Unable to create userscores for each hole for ${userName} in room: ${roomName}`)
    }
  }
}

export async function getUserFromDB(username: string) {
    const user = await prisma.user.findFirst({
        where: {
            name: username
        }
    })
    return user
}

export async function getRoomScore(roomName: string) {
  const roomData = await prisma.room.findUnique({
    where: {
      name: roomName
    },
    include: {
      holes: {
        orderBy: {
          number: 'asc',
        }
      },
      users: {
        include: {
          userScores: true
        }
      },
    },
  })
  
  if (roomData === null) {
    console.error("Could not fetch room data")
    return
  }

  // This Transforms the roomData above into the format for the frontend
  
  // The changes to this section below are to ensure there is always a userScore created for each hold and user in the room
  // this should provide the frontend with the userscore id
  // making updates to the usersocre easier
  const players = roomData.users.map(async user => {
    const scoresPromises = roomData.holes.map(async hole => {
      const scoreForThisHole = user.userScores.find(userScore => userScore.holeId === hole.id)
      // This part cretes a new score if scoreForThisHole is not found
      let newScore
      if (!scoreForThisHole) {
        console.info(`Creating new score for ${user.name} in hole: ${hole.number}
                    hole ID: ${hole.id}`)
        newScore = await prisma.userScore.create({
            data: {
                holeId: hole.id,
                userId: user.id,
            }
      })

      }
      return scoreForThisHole ?? newScore
    })
    
    const scores = await Promise.all(scoresPromises)

   return {
      name: user.name,
      id: user.id,
      scores
    }
  })

  const result = {
    holes: roomData.holes,
    players: await Promise.all(players)
  }

  return result
}

export async function updatePlayerScore({
    userScoreId,
    newScore,
}: {
    userScoreId: number;
    newScore: number;
}) {
    const newUserScore = await prisma.userScore.update({
        where: {
            id: userScoreId,
        },
        data: {
            score: newScore,
            lastAccessed: new Date(),
        }
    })
    return newUserScore
}

export async function createNewHole(roomId: number, holeNumber: number) {
  const hole = await prisma.hole.create({
    data: {
      number: holeNumber,
      roomId: roomId
    }
  })
  if (!hole) throw Error("Unable to create hole")
  return hole
}

export async function validateUserIsInRoom(username: string, roomId: number) {
  const room = await prisma.room.findUnique({
    where: {
      id: roomId,
    },
    include: {
      users: true
    },
  })
  
  if (!room) throw new Error("No Room Found")
  if (!room.users) throw new Error("No Users found in room")

  const user = room.users.find(user => user.name === username)

  if (!user) throw new Error("User not found in room")
    
  return user
}

export async function validateUserIdOwnsUserScore({
  userId,
  userScoreId,
}: {
  userId: number;
  userScoreId: number;
}) {
  const userScore = await prisma.userScore.findUnique({
    where: {
      id: userScoreId
    }
  })

  if (!userScore) throw new Error(`Unable to find User Score record with id ${userScoreId}`)
  
  if (userScore.userId !== userId) throw new Error(`UserID on userscore does not match given userID`)

  return userScore
}
