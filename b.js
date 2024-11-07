const axios = require('axios');
const fs = require('fs');
const https = require('https');
const moment = require('moment-timezone');
const chalk = require('chalk');

// Membaca konfigurasi dari file bearers.json
const config = JSON.parse(fs.readFileSync('bearers.json', 'utf-8'));
const BASE_URL = config.BASE_URL;
const BEARERS = config.BEARERS;
const PROXIES = config.PROXIES;

const accountsData = [];

// Fungsi untuk menangani proxy
function getProxyConfig(token) {
  if (PROXIES && PROXIES[BEARERS.indexOf(token)]) {
    const proxy = PROXIES[BEARERS.indexOf(token)];
    const cleanProxy = proxy.replace(/^https?:\/\//, ''); // Menghapus http:// atau https://
    const proxyParts = cleanProxy.split('@');
    
    // Validasi format proxy
    if (proxyParts.length !== 2) {
      throw new Error(`Invalid proxy format for token ${token}, expected 'username:password@host:port'`);
    }

    const authParts = proxyParts[0].split(':');
    const hostPort = proxyParts[1].split(':');
    
    if (authParts.length !== 2 || hostPort.length !== 2) {
      throw new Error(`Invalid proxy format for token ${token}, expected 'username:password@host:port'`);
    }

    const [username, password] = authParts;
    const [host, portStr] = hostPort;
    const port = parseInt(portStr);
    
    if (isNaN(port) || port < 0 || port >= 65536) {
      throw new Error(`Invalid port number in proxy: ${port}`);
    }

    return {
      proxy: {
        host,
        port,
        auth: { username, password },
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Nonaktifkan verifikasi SSL jika dibutuhkan
        secureProtocol: 'TLSv1_2_method', // Memaksakan penggunaan TLS 1.2
      }),
    };
  }
  return {};
}

// Fungsi untuk login dengan token tertentu
async function login(token, useProxy) {
  try {
    const axiosConfig = {
      url: BASE_URL + '/backend_apis/api/service/checkIn',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {},
    };

    if (useProxy) {
      const proxyConfig = getProxyConfig(token);
      Object.assign(axiosConfig, proxyConfig);
    }

    const { data } = await axios(axiosConfig);
    console.log(`Login response: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    console.log(`Error during login: ${error.message}`);
    throw error;
  }
}

// Fungsi untuk mendapatkan data user
async function getUserData(token, useProxy) {
  try {
    const axiosConfig = {
      url: BASE_URL + '/backend_apis/api/service/userInfo',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    if (useProxy) {
      const proxyConfig = getProxyConfig(token);
      Object.assign(axiosConfig, proxyConfig);
    }

    const { data } = await axios(axiosConfig);
    console.log(`User data for ${token}: ${JSON.stringify(data)}`);
    return data.data || {};
  } catch (error) {
    console.log(`Error while getting user data: ${error.message}`);
    return {};
  }
}

// Fungsi untuk percakapan ulang (retry) pada request
async function retryRequest(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} retries left`);
      return retryRequest(fn, retries - 1);
    } else {
      console.log(`Failed after multiple retries: ${error.message}`);
      throw error;
    }
  }
}

// Fungsi untuk melakukan check-in
async function performCheckIn() {
  try {
    for (let i = 0; i < BEARERS.length; i++) {
      const useProxy = PROXIES[i] && PROXIES[i] !== false;

      const response = await retryRequest(() => login(BEARERS[i], useProxy));
      if (response.success && !response.msg.includes('already checked in')) {
        const userData = await retryRequest(() => getUserData(BEARERS[i], useProxy));
        if (userData && Object.keys(userData).length > 0) {
          accountsData.push(userData);
        } else {
          console.log(`No user data found for token ${BEARERS[i]}`);
        }
      } else {
        console.log(`Account already checked in for token ${BEARERS[i]}`);
        const userData = await retryRequest(() => getUserData(BEARERS[i], useProxy));
        if (userData && Object.keys(userData).length > 0) {
          accountsData.push(userData);
        }
      }
    }

    displayAccountData();
  } catch (error) {
    console.log(`Error during check-in: ${error.message}`);
  }
}

// Fungsi untuk mendapatkan warna acak
function getRandomColor() {
  const colors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.cyan, chalk.magenta];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Fungsi untuk menampilkan data akun
function displayAccountData() {
  console.log(chalk.green('----------------------------------------------------------------------------------------------------------------------------'));
  console.log(chalk.green('ACCOUNT         |    ADDRESS     |       DATE/JAM (GMT+7):      | Total Poin:  |  Proxy:     | TIME RUN:    | JOIN MY CHANNEL TG:'));
  console.log(chalk.green('----------------------------------------------------------------------------------------------------------------------------'));

  const startTime = moment();
  
  if (accountsData.length === 0) {
    console.log('No account data found.');
    return;
  }

  accountsData.forEach(account => {
    const accountName = account.xName ? account.xName.padEnd(12) : 'N/A'.padEnd(12);
    const accountAddress = account.point?.address ? account.point.address.slice(0, 5) + '...' + account.point.address.slice(-5) : 'N/A'.padEnd(40);
    const totalPoints = account.point?.currentPoints ? account.point.currentPoints.toString().padEnd(12) : '0'.padEnd(12);
    const proxyStatus = account.proxy ? 'true'.padEnd(10) : 'false'.padEnd(10);

    // Convert current time to GMT+7
    const currentTime = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'); // GMT+7
    const timeRun = moment.duration(moment().diff(startTime)).humanize();

    console.log(
      `${chalk.cyan(accountName)} | ${chalk.magenta(accountAddress)} | ${currentTime.padEnd(20)} | ${chalk.yellow(totalPoints)} | ${chalk.blue(proxyStatus)} | ${timeRun.padEnd(12)} | ${getRandomColor()('@AirdropJP_JawaPride')}`
    );
  });

  console.log(chalk.green('----------------------------------------------------------------------------------------------------------------------------'));

  setInterval(() => {
    const currentTime = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
    console.log(currentTime);
  }, 1000);
}

// Jalankan check-in
performCheckIn();
