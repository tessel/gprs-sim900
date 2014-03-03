gprs.sendSMS(number, message, callback)
{
  /*
  send an SMS to the specified number

  args
    number
      a string representation of the number. must be at least 10 digits
    message
      a string to send
    callback
      callback function

  callback parameters
    none
  */
}

gprs.dial(number, callback)
{
  /*
  call the specified number

  args
    number
      a string representation of the number. must be at least 10 digits
    callback
      callback function

  callback parameters
    call
      a call object
  */
}

gprs.answerCall(callback)
{
  /*
  answer an incoming voice call

  args
    callback
      callback function

  callback parameters
    call
      a call object
  */
}

gprs.ignoreCall(callback)
{
  /*
  ignore an incoming voice call

  args
    callback
      callback function

  callback parameters
    none
  */
}

gprs.readSMS(messageNumber, callback)
{
  /*
  answer an incoming voice call

  args - two possibilities
    messageNumber
      the index of the message to read. if not specified, the newest message is read
    callback
      callback function

  callback parameters
    err
      error
    message
      the SMS string
  */
}