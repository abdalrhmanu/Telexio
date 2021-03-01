// Can be connected to a db
const users = [];

// Join user to chat
function userJoin(id, username, roomID){
    const user = {id, username, roomID};

    users.push(user);
    return user;
}

// Get the current user
function getCurrentUser(id){
    return users.find(user => user.id === id);
}

// User Leaves Chat
function userLeave(id) {
    const index = users.findIndex(user => user.id === id);

    if(index !== -1){
        return users.splice(index, 1)[0];
    }
}

// Get call participants
function getRoomUsers(roomID) {
    return users.filter(user => user.roomID === roomID);
}

function getNumberOfUsers(roomID){
    // console.log(users[0].roomID === roomID)
    let j;
    for(let i = 0; i < users.length; i++){
        if (users[i].roomID === roomID){ 
            j++;
            // console.log(roomID + " has: " + j);

        }
    }
}

module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers,
    getNumberOfUsers
}