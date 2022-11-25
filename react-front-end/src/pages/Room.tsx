import { useEffect, useState } from "react"
import { io, type Socket } from 'socket.io-client'
import { useParams } from "react-router-dom"
import Button from "../components/Button"


function Room() {
    const { roomId } = useParams()
    const [socket, setSocket] = useState<null | Socket>(null)
    const [isConnected, setIsConnected] = useState<boolean | null>(socket ? socket.connected : null);
    const [lastPong, setLastPong] = useState<null | string>(null);

    console.log({ socket })
    let t = 't'

    useEffect(() => {
        const socket = io(`${import.meta.env.VITE_SERVER_URL}/api/room`)
        setSocket(socket)
        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('pong', () => {
            setLastPong(new Date().toISOString());
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('pong');
            socket.close()
        }
    }, [])

    const sendPing = () => {
        if (!socket) {
            console.error("Socket is not establised")
        } else {
            console.log("Sending ping")
            socket.emit('ping');
        }
    }

    return <div
        className='flex flex-col justify-center items-center w-screen min-h-screen
        bg-gray-800 text-stone-300 gap-8'
    >
        <h1 className='text-5xl font-bold pa8 my-8'>Room {`${roomId}`}</h1>
        <span className="text-lg font-medium m-4">Connected: { '' + isConnected }</span>
        <span className="text-lg font-medium m-4">Last pong: { lastPong || "-" }</span>
        <Button onClick={ sendPing } text="Send Ping" />
    </div>
}

export default Room

