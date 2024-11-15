import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import fs from 'fs'
import { type } from 'os'

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer)

const limits = {}
const limit = 30

if (!fs.existsSync('notes.json')) {
    fs.writeFileSync('notes.json', "{}")
}

app.use(express.static('public'))
app.use('/assets', express.static('assets'))

function validateNote(note) {
    if (typeof(note.x) != "number") {
        return false
    }
    if (typeof(note.y) != "number") {
        return false
    }
    if (typeof(note.rotation) != "number") {
        return false
    }
    if (typeof(note.color) != "number") {
        return false
    }
    return true
}

io.on('connection', (socket)=>{
    const ipAddress = socket.handshake.headers["x-forwarded-for"].split(",")[0];
    console.log(ipAddress)
    socket.emit('notes', fs.readFileSync('notes.json', { encoding: "utf8" }))

    socket.on('notes', notes=>{
        try {
            if (!limits[ipAddress]) {
                limits[ipAddress] = 0
            }

            notes = JSON.parse(notes)
            limits[ipAddress] += notes.length

            if (limits[ipAddress] > limit) {
                throw new Error("Limit reached")
            }
            
            const notesFile = JSON.parse(fs.readFileSync('notes.json', { encoding: "utf8" }))

            Object.keys(notes).forEach(noteID => {
                const note = notes[noteID]
                
                if (!validateNote(note)) {
                    throw new Error("Bad Note")
                }

                notesFile[noteID] = note
            });

            fs.writeFileSync('notes.json', JSON.stringify(notesFile, null, 2))
            io.emit('notes', JSON.stringify(notes))
        } catch (err) {
            console.warn("ERROR!", err.message)
        }
    })
})

setInterval(() => {
    console.log(limits)
    Object.getOwnPropertyNames(limits).forEach(function (prop) {
        delete limits[prop];
    });
    console.log('cleared limits')
}, 3.6e+6);

httpServer.listen(4567)
