
var colorlogger = require('colorlogger');
/* log the logo to terminal */
module.exports = function () {
  colorlogger.clean()
  .colored('cyan').log(
    "   ------------------------------------\r\n\
   |                                    |\r\n\
   |\tRocketEngine v0.5.x\t\t|")
  .colored('yellow').highlight().log(
    "  |\t[ a WebSocket Library ]\t\t|")
  .colored('green').log(
    "  |\tauthor: Ran\t\t\t|")
  .colored('red').log(
    "  |\tmailto: abbshrsoufii@gmail.com\t|")
  .default()
  .colored('cyan').log(
    "  |____________________________________|\r\n"
  );
};