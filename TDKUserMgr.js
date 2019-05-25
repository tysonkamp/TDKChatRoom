module.exports = class TDKUserMgr {
  constructor(tdkAuth, usersHashedPwds) { 
      this.tdkAuth = tdkAuth
      this.usersHashedPwds = usersHashedPwds
  }

  // Return true (success) or false (not authenticated)
  verifyUser(uname,pwd) {
    // NOTE Add some loic to make this always take about the same amount of time.
    // Can't give adversary any information.

    let hashedPwd = this.tdkAuth.hashThis(pwd)
    // careful: in node null == null and null === null !
    if ( this.usersHashedPwds[uname] === hashedPwd && null != hashedPwd ) { 
      return true
    }
  
    return false
  }
  
  // Return true (user added) or false
  addUser(uname,pwd) {
    // add some code to make this take the same time always, not to reveal anything about our method
  
    if ( null != this.usersHashedPwds[uname] ) return false
    
    let hashedPwd = this.tdkAuth.hashThis(pwd)
    
    // if the hashed pwd is null we have a failure
    if ( null == hashedPwd ) return false
  
    this.usersHashedPwds[uname] = hashedPwd
    return true
  }

  userExists(uname) {
    if ( null !=  this.usersHashedPwds[uname] ) return true
    return false
  }
}