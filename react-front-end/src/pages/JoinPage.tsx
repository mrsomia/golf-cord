import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Button from '../components/Button'


function JoinRoomPage() {
    const location = useLocation()
    const createMode = location.pathname.startsWith("/create-room")
    const { roomId } = useParams()
    const [ roomID, setRoomID ] = useState(roomId ?? "")
    const [ userName, setUserName ] = useState("")
    return <div
            className='flex flex-col justify-center items-center w-screen
            min-h-screen bg-gray-800 text-stone-300 gap-8'
            > 
        <h1 className='text-5xl font-bold pa8 my-8'>
            { createMode ? "Create Room" : "Join Room" }
        </h1>
        <form 
            className='flex flex-col justify-center items-center text-center
            gap-3'
        >
            { !createMode && <>
                <label 
                    htmlFor="RoomID"
                    className='text-lg'
                >
                    Room ID
                </label>
                <input 
                    type='text'
                    value={roomID} 
                    id="RoomID" 
                    onChange={e => setRoomID(e.target.value)}
                    className='text-black p-2 px-4 w-60'
                    />
                </>
            }
            <label 
                htmlFor="userName"
                className='text-lg'
            >
                Name
            </label>
            <input 
                type='text'
                value={userName} 
                id="userName" 
                onChange={e => setUserName(e.target.value)}
                className='text-black p-2 px-4 w-60'
            />

            <Button addClasses={"my-16"} text='Join'/>
        </form>
    </div>
}

export default JoinRoomPage
