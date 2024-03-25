const i2c = require('i2c-bus');

const I2C_BUS_NUMBER = 1; // Use 1 for Raspberry Pi 2 and newer
const DEVICE_ADDRESS = 0x10; // The I2C address of PA1010D module

const PMTK_STANDBY = 'PMTK161,0*28';
const PMTK_AWAKE = 'PMTK010,002*2D';
const PMTK_FULL_COLD_START = 'PMTK104*37';
const PMTK_Q_RELEASE = 'PMTK605*31';
const PMTK_SET_NMEA_UPDATE_1HZ = 'PMTK220,1000*1F';
const PMTK_SET_NMEA_OUTPUT_GLLONLY = 'PMTK314,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29'; // turn on only the GPGLL sentence
const PMTK_SET_NMEA_OUTPUT_RMCONLY = 'PMTK314,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29'; // turn on only the GPRMC sentence
const PMTK_SET_NMEA_OUTPUT_VTGONLY = 'PMTK314,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29'; // turn on only the GPVTG
const PMTK_SET_NMEA_OUTPUT_GGAONLY = 'PMTK314,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29'; // turn on just the GPGGA
const PMTK_SET_NMEA_OUTPUT_GSAONLY = 'PMTK314,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29'; // turn on just the GPGSA
const PMTK_SET_NMEA_OUTPUT_GSVONLY = 'PMTK314,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0*29'; // turn on just the GPGSV
const PMTK_SET_NMEA_OUTPUT_RMCGGA  = 'PMTK314,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*28'; // turn on GPRMC and GPGGA
const PMTK_SET_NMEA_OUTPUT_RMCGGAGSA = 'PMTK314,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29'; // turn on GPRMC, GPGGA and GPGSA
const PMTK_SET_NMEA_OUTPUT_ALLDATA = 'PMTK314,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0*28'; // turn on ALL THE DATA
const PMTK_SET_NMEA_OUTPUT_OFF = 'PMTK314,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*28';
const PMTK_SET_BAUD_9600 = 'PMTK251,9600*17';
const PMTK_API_SET_FIX_CTL_200_MILLIHERTZ = 'PMTK300,5000,0,0,0,0*18'; //Once every 5 seconds, 200 millihertz
// Can't fix position faster than 5 times a second!

const i2cBus = i2c.openSync(I2C_BUS_NUMBER);
const buffer = Buffer.alloc(255); // Adjust buffer size as needed

//Initialisierung 
//sendPMTKPacket(PMTK_FULL_COLD_START);
sendPMTKPacket(PMTK_SET_NMEA_OUTPUT_RMCGGA);
sendPMTKPacket(PMTK_SET_NMEA_UPDATE_1HZ);
sendPMTKPacket(PMTK_SET_BAUD_9600);
sendPMTKPacket(PMTK_API_SET_FIX_CTL_200_MILLIHERTZ);

//Read GPS data periodically
setInterval(readGPSData, 1000); // Read every 1 second

/*
i = 0;
while(i<10) {
  readGPSData();
  i++;
  delay(1000);
};
*/

function sendPMTKPacket(set) {
  PMTK_SET = ('$'+set+'\r\n'); //add preamble und <cr><lf>
 // console.log(PMTK_SET);
  pmtkset = Buffer.from(PMTK_SET);
  i2cBus.i2cWrite(DEVICE_ADDRESS, pmtkset.length, pmtkset, (err, bytesWritten, buffer) => {
    if (err) {
      console.error('Error sending data:', err);
    }else{
   //wait4ack();
    }; //auf Bestätigung warten (PMTK_ACK 'PMTK001,CMD,FLAG') //Flag: 0=Invalid; 1=unsupported; 2=valid, but failed; 3=succeeded

  });
};

  function format(num, length) {
  num = num.toString();
  while (num.length < length) num = '0' + num;
  return num;
  }

function parse(data) {
  let SentenceStart = data.indexOf('$GNGGA');
  let SentenceEnd = data.indexOf('*',SentenceStart);
//console.log(SentenceStart, SentenceEnd);
  let GGASentence = data.slice(SentenceStart,SentenceEnd);
  let splitString = GGASentence.split(',');
//console.log(splitString);

  let time = splitString[1];
  let hour = parseInt(time.substr(0,2));
  let minute = parseInt(time.substr(2,2));
  let seconds = parseInt(time.substr(4,2));
  let milliseconds = time * 1000;
  
  var latitude = splitString[2];
  var latDeg = parseInt(latitude.substr(0,2));
  var latMin = parseInt(latitude.substr(2,2));
  var latSek = parseInt(latitude.substr(5,4));

  let hemisphereLatitude = (splitString[3]);
  
  var longitude = splitString[4];
  var longDeg = parseInt(longitude.substr(0,3));
  var longMin = parseInt(longitude.substr(3,2));
  var longSek = parseInt(longitude.substr(6,4));

  const hemisphereLongitude = (splitString[5]);

  const fixquality = parseInt(splitString[6]);
  const satellites = parseInt(splitString[7]);
  const HDOP  = parseFloat(splitString[8]);
  const altitude = parseFloat(splitString[9]);
  const geoidheight = parseFloat(splitString[11]);



  while (fixquality === 0) {
  console.log('\x1b[31m','Warten auf Fix!','\n');
  break;
  };

  while (data.includes('PMTK001',5) )  {
  let SentenceStart = data.indexOf('$PMTK');
  let SentenceEnd = data.indexOf('*',SentenceStart);
  let Sentence = data.slice(SentenceStart,SentenceEnd);
  let splitString = Sentence.split(',');
  let PacketType = splitString[1];
  let Flag = parseInt(splitString[2]);
  switch (Flag) {
    case 0:
      var PMTK_ACK = 'invalid';
      break;
    case 1:
      var PMTK_ACK = 'unsopported';
      break;
    case 2:
      var PMTK_ACK = 'valid, but action failed';
      break;
    case 3:
      var PMTK_ACK = 'valid, and action succeeded';
      break;
  }
  console.log('\x1b[32m','Der Befehl:',PacketType,'wurde',PMTK_ACK,' ausgeführt.');
  break;
  };

  console.log("\x1b[0m",'Zeit UTC: ',format(hour,2),':',format(minute,2),':',format(seconds,2));
  console.log('Anzahl der Satelliten:',satellites);

//console.log(longitude);

  console.log('Lat:', format(latDeg,2),'\u00B0',format(latMin,2),'\u0027',format(latSek,4),'\u0027\u0027',hemisphereLatitude);
  console.log('Long:', format(longDeg,3),'\u00B0',format(longMin,2),'\u0027',format(longSek,4),'\u0027\u0027',hemisphereLongitude,'\n');
}; 



function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function readGPSData() {
  i2cBus.i2cRead(DEVICE_ADDRESS, buffer.length, buffer, (err, bytesRead, buffer) => {
    if (err) {
      console.error('Error reading data:', err);
      } else {
      var data = buffer.toString('utf8', 0, bytesRead);
      var index = data.indexOf("$");
      if (index !== -1) {
        parse(data);
    }else{
      return;
      };
      };
  }); 
};

//Bestätigung eines Commands abwarten
function wait4ack() {
  readGPSData();
  while ( (count < 100) || ( data.includes('001',5) && PMTK_SET.slice(5,8)===data.slice(9,12) && data.slice(13,14)==='3' ) ) {
   console.log('Versuch:', count);
  console.log('Daten', data);
  count ++;
  delay(1000);
  };
  /*
  do {
  i2cBus.i2cRead(DEVICE_ADDRESS, buffer.length, buffer, (err, bytesRead, buffer) => {
    if (err) {
      console.error('Error reading data:', err);
      } else {
      const data = buffer.toString('utf8', 0, bytesRead);
      while (data.includes('001',5)&&(PMTK_SET.slice(5,8)===data.slice(9,12))&&(data.slice(13,14)==='3'))
        {
          console.log('Geschafft!');
        }
    }     
  });
} while (data.includes('001',5)&&(PMTK_SET.slice(5,8)===data.slice(9,12))&&(data.slice(13,14)==='3'))
{  console.log('Wahr wohl nix!') };
*/
};

// Check of NMEA Sentence Checksum wthout $ and *
function chksum(nmea) {
  const buffer = Buffer.from(nmea);
  let xorsum = 0;
  for ( let i = 0; i <= buffer.length; i++) {
  xorsum = xorsum^buffer[i];
  };
    // Convert it to hexadecimal (base-16, upper case, most significant nybble first).
    var cs = Number(xorsum).toString(16).toUpperCase();
    if (cs.length < 2) {
      cs = ("00" + cs).slice(-2);
    }
  console.log(cs);
}

// Close I2C connection when done
process.on('SIGINT', () => {
  i2cBus.closeSync();
  console.log('\n\nI2C connection closed');
  process.exit();
});
