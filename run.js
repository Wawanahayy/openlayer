const axios = require('axios');
const fs = require('fs');
const moment = require('moment-timezone');
const chalk = require('chalk');

// Membaca konfigurasi dari file bearers.json
const config = JSON.parse(fs.readFileSync('bearers.json', 'utf-8'));
const BASE_URL = config.BASE_URL;
const BEARERS = config.BEARERS;
const PROXIES = config.PROXIES;

const accountsData = [];

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

    if (useProxy && PROXIES) {
      const proxy = PROXIES[BEARERS.indexOf(token)] || null;
      if (proxy) {
        axiosConfig.proxy = {
          host: proxy.split('@')[1].split(':')[0],
          port: proxy.split(':')[2],
          auth: {
            username: proxy.split('://')[1].split(':')[0],
            password: proxy.split(':')[1].split('@')[0],
          },
        };
      }
    }

    const { data } = await axios(axiosConfig);
    console.log(`Login response: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    console.log(`Error during login: ${error.message}`);
    throw error;
  }
}

async function getUserData(token, useProxy) {
  try {
    const axiosConfig = {
      url: BASE_URL + '/backend_apis/api/service/userInfo',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    if (useProxy && PROXIES) {
      const proxy = PROXIES[BEARERS.indexOf(token)] || null;
      if (proxy) {
        axiosConfig.proxy = {
          host: proxy.split('@')[1].split(':')[0],
          port: proxy.split(':')[2],
          auth: {
            username: proxy.split('://')[1].split(':')[0],
            password: proxy.split(':')[1].split('@')[0],
          },
        };
      }
    }

    const { data } = await axios(axiosConfig);
    console.log(`User data for ${token}: ${JSON.stringify(data)}`);
    return data.data || {};
  } catch (error) {
    console.log(`Error while getting user data: ${error.message}`);
    return {};
  }
}

async function performCheckIn() {
  try {
    for (let i = 0; i < BEARERS.length; i++) {
      const useProxy = PROXIES[i] && PROXIES[i] !== false;

      const response = await login(BEARERS[i], useProxy);
      if (response.success && !response.msg.includes('already checked in')) {
        const userData = await getUserData(BEARERS[i], useProxy);

        if (userData && Object.keys(userData).length > 0) {
          accountsData.push(userData);
        } else {
          console.log(`No user data found for token ${BEARERS[i]}`);
        }
      } else {
        console.log(`Account already checked in for token ${BEARERS[i]}`);
        const userData = await getUserData(BEARERS[i], useProxy);
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

function getRandomColor() {
  const colors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.cyan, chalk.magenta];
  return colors[Math.floor(Math.random() * colors.length)];
}

function displayAccountData() {
  console.log(chalk.green('----------------------------------------------------------------------------------------------------------------------------'));
  console.log(chalk.green('ACCOUNT         |    ADDRESS     |    DATE/JAM (GMT+7):    | Total Poin:  |  Proxy:     | TIME RUN:    | JOIN MY CHANNEL TG:'));
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
    const currentTime = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'); // GMT+7
    const duration = moment.duration(moment().diff(startTime));
    const hours = String(duration.hours()).padStart(2, '0');
    const minutes = String(duration.minutes()).padStart(2, '0');
    const seconds = String(duration.seconds()).padStart(2, '0');
    const timeRun = `${hours}:${minutes}:${seconds}`;

    console.clear();
    console.log(chalk.green('----------------------------------------------------------------------------------------------------------------------------'));
    console.log(chalk.green('ACCOUNT      |    ADDRESS     |  DATE/JAM (GMT+7):  |  Total Poin:  |   Proxy:    | TIME RUN:    |    JOIN MY CHANNEL TG:  |'));
    console.log(chalk.green('----------------------------------------------------------------------------------------------------------------------------'));

    accountsData.forEach(account => {
      const accountName = account.xName ? account.xName.padEnd(12) : 'N/A'.padEnd(12);
      const accountAddress = account.point?.address ? account.point.address.slice(0, 5) + '...' + account.point.address.slice(-5) : 'N/A'.padEnd(40);
      const totalPoints = account.point?.currentPoints ? account.point.currentPoints.toString().padEnd(12) : '0'.padEnd(12);
      const proxyStatus = account.proxy ? 'true'.padEnd(10) : 'false'.padEnd(10);

      // Menampilkan waktu dengan warna acak setiap detik
      const color = getRandomColor();
      console.log(
        `${chalk.cyan(accountName)} | ${chalk.magenta(accountAddress)} | ${color(currentTime.padEnd(20))} | ${chalk.yellow(totalPoints)} | ${chalk.blue(proxyStatus)} | ${timeRun.padEnd(12)} | ${color('@AirdropJP_JawaPride')}`
      );
    });

    console.log(chalk.green('---------------------------------------------------------------------------------------------------------------------------|'));
  }, 1000);
}


async function main() {
  console.log(`[ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] Starting daily check-in process...`);
  await performCheckIn();

  setInterval(async () => {
    console.log(`[ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] Running scheduled check-in...`);
    await performCheckIn();
  }, 12 * 60 * 60 * 1000);
}

main();
