import getWhitelistedDomains from '../getWhitelistedDomains';

jest.mock('messaging-api-messenger');

jest.mock('../../shared/log');
jest.mock('../../shared/getConfig');

const { MessengerClient } = require('messaging-api-messenger');

const log = require('../../shared/log');
const getConfig = require('../../shared/getConfig');

const MOCK_FILE_WITH_PLATFORM = {
  messenger: {
    accessToken: '__FAKE_TOKEN__',
  },
  line: {},
};
const configPath = 'bot.sample.json';

let _client;

beforeEach(() => {
  _client = {
    getDomainWhitelist: jest.fn(),
  };
  MessengerClient.connect = jest.fn(() => _client);
  log.error = jest.fn();
  log.print = jest.fn();
  getConfig.mockReturnValue(MOCK_FILE_WITH_PLATFORM.messenger);
});

it('be defined', () => {
  expect(getWhitelistedDomains).toBeDefined();
});

describe('#getConfig', () => {
  it('will call `bottender.config.js` and platform = messenger when NOT passed <config_path>', async () => {
    _client.getDomainWhitelist.mockReturnValue(
      Promise.resolve({
        data: [
          {
            whitelisted_domains: [
              'http://www.facebook.com',
              'http://www.yoctol.com',
            ],
          },
        ],
      })
    );

    await getWhitelistedDomains();
    expect(getConfig).toBeCalledWith('bottender.config.js', 'messenger');
  });

  it('will call <config_path> when it was passed', async () => {
    _client.getDomainWhitelist.mockReturnValue(
      Promise.resolve({
        data: [
          {
            whitelisted_domains: [
              'http://www.facebook.com',
              'http://www.yoctol.com',
            ],
          },
        ],
      })
    );

    await getWhitelistedDomains(configPath);
    expect(getConfig).toBeCalledWith('bot.sample.json', 'messenger');
  });
});

describe('resolved', () => {
  it('call getDomainWhitelist', async () => {
    _client.getDomainWhitelist.mockReturnValue(
      Promise.resolve({
        data: [
          {
            whitelisted_domains: [
              'http://www.facebook.com',
              'http://www.yoctol.com',
            ],
          },
        ],
      })
    );

    await getWhitelistedDomains(configPath);

    expect(log.print).toHaveBeenCalledTimes(2);
    expect(_client.getDomainWhitelist).toBeCalled();
  });

  it('error when no config setting', async () => {
    _client.getDomainWhitelist.mockReturnValue(
      Promise.resolve({
        data: [],
      })
    );

    await getWhitelistedDomains(configPath);

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(_client.getDomainWhitelist).toBeCalled();
  });
});

describe('reject', () => {
  it('handle error thrown with only status', async () => {
    const error = {
      response: {
        status: 400,
      },
    };
    _client.getDomainWhitelist.mockReturnValue(Promise.reject(error));

    process.exit = jest.fn();

    await getWhitelistedDomains(configPath);

    expect(log.error).toHaveBeenCalledTimes(2);
    expect(process.exit).toBeCalled();
  });

  it('handle error thrown by messenger', async () => {
    const error = {
      response: {
        status: 400,
        data: {
          error: {
            message: '(#100) ...',
            type: 'OAuthException',
            code: 100,
            error_subcode: 2018145,
            fbtrace_id: 'HXd3kIOXLsK',
          },
        },
      },
    };
    _client.getDomainWhitelist.mockReturnValue(Promise.reject(error));

    process.exit = jest.fn();

    await getWhitelistedDomains(configPath);

    expect(log.error).toHaveBeenCalledTimes(3);
    expect(log.error.mock.calls[2][0]).not.toMatch(/\[object Object\]/);
    expect(process.exit).toBeCalled();
  });

  it('handle error thrown by ourselves', async () => {
    const error = {
      message: 'something wrong happened',
    };
    _client.getDomainWhitelist.mockReturnValue(Promise.reject(error));

    process.exit = jest.fn();

    await getWhitelistedDomains(configPath);

    expect(log.error).toHaveBeenCalledTimes(2);
    expect(process.exit).toBeCalled();
  });
});