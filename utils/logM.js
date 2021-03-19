// Simple logging function
function logM(msg, room) {
  if (room) {
    console.log("<< "+room+" >>: " + msg);
  } else {
    console.log("<<SERVER>>: " + msg);
  }
}

module.exports = logM;