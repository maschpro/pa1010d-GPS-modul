const i2c = require('i2c-bus');

const I2C_BUS_NUMBER = 1; // Use 1 for Raspberry Pi 2 and newer
const DEVICE_ADDRESS = 0x10; // The I2C address of PA1010D module

const PMTK_STANDBY = 'PMTK161,0*28';
const PMTK_AWAKE = 'PMTK010,002*2D';
const PMTK_FULL_COLD_START = '104*37';
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

sendPMTKPacket(PMTK_SET_NMEA_UPDATE_1HZ);
sendPMTKPacket(PMTK_SET_BAUD_9600);
sendPMTKPacket(PMTK_SET_NMEA_OUTPUT_RMCGGAGSA);
sendPMTKPacket(PMTK_API_SET_FIX_CTL_200_MILLIHERTZ);

//Read GPS data periodically
setInterval(readGPSData, 500); // Read every 1 second

function sendPMTKPacket(set) {
  PMTK_SET = ('$'+set+'\r\n'); //add preamble und <cr><lf>
  const pmtkset = Buffer.from(PMTK_SET);
  i2cBus.i2cWrite(DEVICE_ADDRESS, pmtkset.length, pmtkset, (err, bytesWritten, buffer) => {
    if (err) {
      console.error('Error sending data:', err);
    }else{
     // console.log(PMTK_SET);
    //  wait4ack();
    }; //auf Bestätigung warten (PMTK_ACK 'PMTK001,CMD,FLAG') //Flag: 0=Invalid; 1=unsupported; 2=valid, but failed; 3=succeeded
  });
};

function parse(data) {
  //console.log(data);
  while (data.includes('GGA',3)) { //GGA Sentence
  console.log(data);
  const splitString = data.split(',');
  console.log(splitString[2]);

  let time = parseInt(splitString[1]);
  let hour = time /10000;
  let minute = (time % 10000) /100;
  let seconds = (time % 100);
  let milliseconds = data.slice(14,17) * 1000;
  console.log('Time: ',hour,':',minute,':',seconds,'.',milliseconds);

  const latitudeDegrees = parseInt(splitString[3]);
  const hemisphereLatitude = parseInt(splitString[4]);
  const longitude = parseInt(splitString[5]);
  const hemisphereLongitude = parseInt(splitString[6]);
  const fixquality = parseInt(splitString[7]);
  if (fixquality > 0) {
  console.log('Wir haben ein fix') };
  const satellites = parseInt(splitString[8]);
  //if (satellites > 0) {
  console.log('Anzahl der Satelliten:',satellites);
  const HDOP  = parseInt(splitString[9]);
  const altitude = parseInt(splitString[10]);
  const geoidheight = parseInt(splitString[12]);
    return; 
  };
}


function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function readGPSData() {
  i2cBus.i2cRead(DEVICE_ADDRESS, buffer.length, buffer, (err, bytesRead, buffer) => {
    if (err) {
      console.error('Error reading data:', err);
      } else {
      const data = buffer.toString('utf8', 0, bytesRead);
      //console.log(data);
      parse(data);
    }     
  });
};

//Bestätigung eines Commands abwarten
function wait4ack() {
  i2cBus.readI2cBlockSync(DEVICE_ADDRESS, 0, buffer.length, buffer);
  const data = buffer.toString('utf8', 0, buffer.length);
  let count = 1;
  while ( (count < 100) || ( data.includes('001',5) && PMTK_SET.slice(5,8)===data.slice(9,12) && data.slice(13,14)==='3' ) ) {
  console.log('Versuch:', count);
  console.log('Daten', data);
  count ++;
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
