import { DISCORD_CLIENT_ID } from 'utils/config';
import { DiscordUser } from 'utils/types';

interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

const redirect_uri = window.location.origin + '/points';
const scope = 'identify guilds guilds.members.read';

export const useDiscordConnect = () => {
  const connect = async (): Promise<{
    accessTokenUser: AccessToken;
    userConnected: DiscordUser;
  }> => {
    return new Promise((resolve, reject) => {
      const url = new URL('https://discord.com/oauth2/authorize');
      url.searchParams.append('client_id', DISCORD_CLIENT_ID);
      // Implicit grant: Discord returns the access token in the URL fragment, so no
      // client secret is needed (it would be public in the browser bundle).
      url.searchParams.append('response_type', 'token');
      url.searchParams.append('redirect_uri', redirect_uri);
      url.searchParams.append('scope', scope);

      const accessTokenUser: AccessToken = {
        access_token: '',
        token_type: '',
        expires_in: 0,
        scope: ''
      };

      const userConnected: DiscordUser = {
        id: '',
        username: '',
        role: '',
        avatar: '',
        global_name: ''
      };

      const popup = window.open(url.toString(), '_blank');
      const intervalId = setInterval(() => {
        try {
          if (!popup || !popup.location.href.includes(redirect_uri)) return;

          const urlParams = new URLSearchParams(popup.location.hash.slice(1));
          const accessToken = urlParams.get('access_token');

          if (!accessToken) {
            console.log('no access token returned by Discord');
            reject();
            return;
          }

          clearInterval(intervalId);
          popup.close();

          accessTokenUser.access_token = accessToken;
          accessTokenUser.token_type = urlParams.get('token_type') ?? '';
          accessTokenUser.expires_in = Number(urlParams.get('expires_in') ?? 0);
          accessTokenUser.scope = urlParams.get('scope') ?? '';

          (async () => {
            // appel pour authentifier l'utilisateur
            const userResponse = await fetch(
              'https://discord.com/api/v10/users/@me',
              {
                headers: {
                  Authorization: 'Bearer ' + accessTokenUser.access_token
                }
              }
            ).catch((err) => console.log(err));
            if (!userResponse) return;

            const userResponseData = await userResponse.json();
            userConnected.id = userResponseData.id;
            userConnected.username = userResponseData.username;
            userConnected.avatar = userResponseData.avatar;
            userConnected.global_name = userResponseData.username;

            resolve({ accessTokenUser, userConnected });
          })().catch((err) => console.log(err));
        } catch (error) {}
      }, 100);
    });
  };

  return { connect };
};
