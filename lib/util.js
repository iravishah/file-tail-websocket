const { openSync, statSync, read, close } = require('fs');
const config = require('../env/local.json');

function readChar(bufferSize = 1, fd, stats, currentChars) {
  return new Promise((resolve, reject) => {
    return read(fd, Buffer.alloc(bufferSize), 0, bufferSize, stats - currentChars, (e, br, b) => {
      if (e) {
        return reject(e);
      }
      return resolve(b.toString());
    });
  });
}

function start(file, maxLineCount) {
  return new Promise((resolve, reject) => {
    let line = '';
    let line_count = 0;
    let char = 1;

    const fd = openSync(file, 'r');
    const stats = statSync(file).size;

    const read_loop = function () {
      if (line.length >= stats || line_count >= maxLineCount) {
        if (config.newLineChars.indexOf(line[0]) !== -1) {
          line = line.substring(1);
        }
        closeFile(fd);
        return resolve(line);
      }
      readChar(1, fd, stats, char)
        .then((data) => {
          line = data + line;
          char++;
          if (config.newLineChars.indexOf(data) !== -1) {
            line_count++
          }
        })
        .then(read_loop)
        .catch((e) => {
          return reject(e);
        })
    }
    return read_loop()
  })
}

function tail(file, initialSize, lastTime, conn) {
  let lastDate = new Date(lastTime).getTime();
  setInterval(() => {
    const stats = statSync(file);
    const fd = openSync(file, 'r');

    const size = stats.size;
    if (new Date(stats.mtime).getTime() > lastDate) {
      lastDate = new Date(stats.mtime).getTime();
      if (size - initialSize > 0) {
        readChar(size - initialSize, fd, size, size - initialSize)
          .then(data => {
            initialSize = size
            data = data.substring(1)
            conn.sendUTF(data);
          })
          .catch((e) => {
            console.log(e);
          })
      }
    }
  }, config.tailTime);
}

function closeFile(fd) {
  close(fd, () => { });
}

module.exports = {
  start,
  tail
}