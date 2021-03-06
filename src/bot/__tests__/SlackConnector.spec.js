import { SlackOAuthClient } from 'messaging-api-slack';
import warning from 'warning';

import SlackConnector from '../SlackConnector';
import SlackEvent from '../../context/SlackEvent';
import SlackContext from '../../context/SlackContext';

jest.mock('messaging-api-slack');
jest.mock('warning');

const accessToken = 'SLACK_accessTOKEN';

const request = {
  body: {
    token: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    team_id: 'T02R00000',
    api_app_id: 'A6A00000',
    event: {
      type: 'message',
      user: 'U13A00000',
      text: 'hello',
      ts: '1500435914.425136',
      channel: 'C6A900000',
      event_ts: '1500435914.425136',
    },
    type: 'event_callback',
    authed_users: ['U6AK00000'],
    event_id: 'Ev6BEYTAK0',
    event_time: 1500435914,
  },
};

const botRequest = {
  body: {
    token: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    team_id: 'T02R00000',
    api_app_id: 'A6A00000',
    event: {
      type: 'message',
      user: 'U13A00000',
      text: 'hello',
      bot_id: 'B6AK00000',
      ts: '1500435914.425136',
      channel: 'C6A900000',
      event_ts: '1500435914.425136',
    },
    type: 'event_callback',
    authed_users: ['U6AK00000'],
    event_id: 'Ev6BEYTAK0',
    event_time: 1500435914,
  },
};

const interactiveMessageRequest = {
  body: {
    payload:
      '{"type":"interactive_message","actions":[{"name":"game","type":"button","value":"chess"}],"callback_id":"wopr_game","team":{"id":"T056K3CM5","domain":"ricebug"},"channel":{"id":"D7WTL9ECE","name":"directmessage"},"user":{"id":"U056K3CN1","name":"tw0517tw"},"action_ts":"1511153911.446899","message_ts":"1511153905.000093","attachment_id":"1","token":"n8uIomPoBtc7fSnbHbQcmwdy","is_app_unfurl":false,"original_message":{"type":"message","user":"U7W1PH7MY","text":"Would you like to play a game?","bot_id":"B7VUVQTK5","attachments":[{"callback_id":"wopr_game","fallback":"You are unable to choose a game","text":"Choose a game to play","id":1,"color":"3AA3E3","actions":[{"id":"1","name":"game","text":"Chess","type":"button","value":"chess","style":""},{"id":"2","name":"game","text":"Falken\'s Maze","type":"button","value":"maze","style":""},{"id":"3","name":"game","text":"Thermonuclear War","type":"button","value":"war","style":"danger","confirm":{"text":"Wouldn\'t you prefer a good game of chess?","title":"Are you sure?","ok_text":"Yes","dismiss_text":"No"}}]}],"ts":"1511153905.000093"},"response_url":"https:\\/\\/hooks.slack.com\\/actions\\/T056K3CM5\\/274366307953\\/73rSfbP0LcVPWfAYB3GicEdD","trigger_id":"274927463524.5223114719.95a5b9f6d3b30dc7e07dec6bfa4610e5"}',
  },
};

const RtmMessage = {
  type: 'message',
  channel: 'G7W5WAAAA',
  user: 'U056KAAAA',
  text: 'Awesome!!!',
  ts: '1515405044.000352',
  source_team: 'T056KAAAA',
  team: 'T056KAAAA',
};

function setup({ verificationToken } = {}) {
  const mockSlackOAuthClient = {
    getUserInfo: jest.fn(),
    getConversationInfo: jest.fn(),
    getAllConversationMembers: jest.fn(),
    getAllUserList: jest.fn(),
  };
  SlackOAuthClient.connect = jest.fn();
  SlackOAuthClient.connect.mockReturnValue(mockSlackOAuthClient);
  return {
    connector: new SlackConnector({ accessToken, verificationToken }),
    mockSlackOAuthClient,
  };
}

describe('#platform', () => {
  it('should be slack', () => {
    const { connector } = setup();
    expect(connector.platform).toBe('slack');
  });
});

describe('#client', () => {
  it('should be client', () => {
    const { connector, mockSlackOAuthClient } = setup();
    expect(connector.client).toBe(mockSlackOAuthClient);
  });

  it('support custom client', () => {
    const client = {};
    const connector = new SlackConnector({ client });
    expect(connector.client).toBe(client);
  });
});

describe('#getUniqueSessionKey', () => {
  it('extract correct channel id', () => {
    const { connector } = setup();
    const channelId = connector.getUniqueSessionKey(request.body);
    expect(channelId).toBe('C6A900000');
  });

  it('extract correct channel id from interactive message request', () => {
    const { connector } = setup();
    const channelId = connector.getUniqueSessionKey(
      interactiveMessageRequest.body
    );
    expect(channelId).toBe('D7WTL9ECE');
  });

  it('extract correct channel id from RTM WebSocket message', () => {
    const { connector } = setup();
    const channelId = connector.getUniqueSessionKey(RtmMessage);
    expect(channelId).toBe('G7W5WAAAA');
  });
});

describe('#updateSession', () => {
  it('update session with data needed', async () => {
    const { connector, mockSlackOAuthClient } = setup();

    const user = {
      id: 'U13A00000',
    };
    const channel = {
      id: 'C6A900000',
    };
    const members = [user];
    const session = {};

    mockSlackOAuthClient.getUserInfo.mockReturnValue(Promise.resolve(user));
    mockSlackOAuthClient.getConversationInfo.mockReturnValue(
      Promise.resolve(channel)
    );
    mockSlackOAuthClient.getAllConversationMembers.mockReturnValue(
      Promise.resolve(members)
    );
    mockSlackOAuthClient.getAllUserList.mockReturnValue(
      Promise.resolve(members)
    );

    await connector.updateSession(session, request.body);

    expect(mockSlackOAuthClient.getUserInfo).toBeCalledWith('U13A00000');
    expect(mockSlackOAuthClient.getConversationInfo).toBeCalledWith(
      'C6A900000'
    );
    expect(mockSlackOAuthClient.getAllConversationMembers).toBeCalledWith(
      'C6A900000'
    );
    expect(mockSlackOAuthClient.getAllUserList).toBeCalled();
    expect(session).toEqual({
      user: {
        _updatedAt: expect.any(String),
        ...user,
      },
      channel: {
        _updatedAt: expect.any(String),
        members,
        ...channel,
      },
      team: { members, _updatedAt: expect.any(String) },
    });
  });

  it('not update session if it is bot event request', async () => {
    const { connector, mockSlackOAuthClient } = setup();

    const session = {};

    await connector.updateSession(session, botRequest.body);

    expect(mockSlackOAuthClient.getUserInfo).not.toBeCalled();
    expect(mockSlackOAuthClient.getConversationInfo).not.toBeCalled();
    expect(mockSlackOAuthClient.getAllConversationMembers).not.toBeCalled();
    expect(mockSlackOAuthClient.getAllUserList).not.toBeCalled();
    expect(session).toEqual({});
  });

  it('not update session if no senderId in body', async () => {
    const { connector, mockSlackOAuthClient } = setup();

    const session = {};
    const body = {
      token: 'xxxxxxxxxxxxxxxxxxxxxxxxxxx',
      team_id: 'T02R00000',
      api_app_id: 'A6A00000',
      event: {
        type: 'message',
        user: undefined,
        text: 'hello',
        ts: '1500435914.425136',
        channel: 'C6A900000',
        event_ts: '1500435914.425136',
      },
      type: 'event_callback',
      authed_users: ['U6AK00000'],
      event_id: 'Ev6BEYTAK0',
      event_time: 1500435914,
    };

    await connector.updateSession(session, body);

    expect(mockSlackOAuthClient.getUserInfo).not.toBeCalled();
    expect(mockSlackOAuthClient.getConversationInfo).not.toBeCalled();
    expect(mockSlackOAuthClient.getAllConversationMembers).not.toBeCalled();
    expect(mockSlackOAuthClient.getAllUserList).not.toBeCalled();
  });

  it('update session with data needed when receiving interactive message request', async () => {
    const { connector, mockSlackOAuthClient } = setup();

    const user = {
      id: 'U056K3CN1',
    };
    const channel = {
      id: 'D7WTL9ECE',
    };
    const members = [user];
    const session = {};

    mockSlackOAuthClient.getUserInfo.mockReturnValue(Promise.resolve(user));
    mockSlackOAuthClient.getConversationInfo.mockReturnValue(
      Promise.resolve(channel)
    );
    mockSlackOAuthClient.getAllConversationMembers.mockReturnValue(
      Promise.resolve(members)
    );
    mockSlackOAuthClient.getAllUserList.mockReturnValue(
      Promise.resolve(members)
    );

    await connector.updateSession(session, interactiveMessageRequest.body);

    expect(mockSlackOAuthClient.getUserInfo).toBeCalledWith('U056K3CN1');
    expect(mockSlackOAuthClient.getConversationInfo).toBeCalledWith(
      'D7WTL9ECE'
    );
    expect(mockSlackOAuthClient.getAllConversationMembers).toBeCalledWith(
      'D7WTL9ECE'
    );
    expect(mockSlackOAuthClient.getAllUserList).toBeCalled();
    expect(session).toEqual({
      user: {
        _updatedAt: expect.any(String),
        ...user,
      },
      channel: {
        _updatedAt: expect.any(String),
        members,
        ...channel,
      },
      team: { members, _updatedAt: expect.any(String) },
    });
  });
});

describe('#mapRequestToEvents', () => {
  it('should map request to SlackEvents', () => {
    const { connector } = setup();
    const events = connector.mapRequestToEvents(request.body);

    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(SlackEvent);
  });
});

describe('#createContext', () => {
  it('should create SlackContext', () => {
    const { connector } = setup();
    const event = {};
    const session = {};

    const context = connector.createContext({
      event,
      session,
    });

    expect(context).toBeDefined();
    expect(context).toBeInstanceOf(SlackContext);
  });
});

describe('#verifySignature', () => {
  it('should return true and show warning if verification token not set', () => {
    const { connector } = setup();

    const result = connector.verifySignature('signature');

    expect(result).toBe(true);
    expect(warning).toBeCalledWith(
      false,
      '`verificationToken` is not set. Will bypass Slack event verification.\nPass in `verificationToken` to perform Slack event verification.'
    );
  });

  it('should return true if signature is equal to verification token', () => {
    const { connector } = setup({ verificationToken: 'mytoken' });

    const result = connector.verifySignature('mytoken');

    expect(result).toBe(true);
  });
});
