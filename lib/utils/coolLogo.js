
var colorlogger = require('colorlogger');
/* log the logo to terminal */
module.exports = function () {
  colorlogger
  .clean()
  .colored('cyan').log(
    "   ____________________________________________________________\r\n",
    "  |\t\t\t                \t\t\t|\r\n",
    "  |\t\t\t                \t\t\t|\r\n",
    "  |\t\t\t ______________ \t\t\t|\r\n",
    "  |\t\t\t|_   __________|\t\t\t|\r\n",
    "  |\t\t\t  | |           \t\t\t|\r\n",
    "  |\t\t\t  | |           \t\t\t|\r\n",
    "  |\t\t\t  | |________   \t\t\t|\r\n",
    "  |\t\t\t  |  ________|  \t\t\t|\r\n",
    "  |\t\t\t  | |           \t\t\t|\r\n",
    "  |\t\t\t  | |           \t\t\t|\r\n",
    "  |\t\t\t  | |           \t\t\t|\r\n",
    "  |\t\t\t _| |_          \t\t\t|\r\n",
    "  |\t\t\t|__ __|         \t\t\t|\r\n",
    "  |\t\t\t                \t\t\t|\r\n",
    "  |\t\t\t                \t\t\t|")
  .colored('yellow').highlight().log(
    "  |\t[ fSlider WebSocket Framework V0.2.8 ]\t\t\t|")
  .colored('green').log(
    "  |\tauthor: Ran\t\t\t\t\t\t|")
  .colored('red').log(
    "  |\tmailto: abbshrsoufii@gmail.com\t\t\t\t|")
  .default().colored('cyan').log(
    "  |____________________________________________________________|\r\n"
  );
};