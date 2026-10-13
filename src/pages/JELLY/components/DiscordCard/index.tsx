import { useContext } from 'react';
import { toast } from 'react-toastify';
import Button from 'components/Button';
import DiscordUser from 'components/DiscordUser';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useDiscordConnect } from 'hooks/useDiscordConnect';
import { useSignMessage } from 'hooks/useSignMessage';
import { trpc } from 'utils/trpc';
import './index.scss';
import { faWarning } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const DiscordCard = () => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const { connect } = useDiscordConnect();
  const discordSign = useSignMessage();

  const registerDiscord = trpc.registerDiscord.useMutation({
    onSuccess() {
      refetch();
      toast.success('Discord account linked successfully');
    },
    onError: (error) => toast.error(error.message)
  });

  const { data: _discordId, refetch } = trpc.getDiscordId.useQuery(
    { userAddress: connectedAddress },
    { enabled: !!connectedAddress }
  );

  const discordId = _discordId || '';
  const optsDiscord = { enabled: !!_discordId };

  const { data: discordUser } = trpc.getDiscordUser.useQuery(
    { discordId },
    optsDiscord
  );

  const { data: discordRoles } = trpc.getDiscordRoles.useQuery(
    { discordId },
    optsDiscord
  );

  const handleDiscordConnect = async () => {
    if (discordId) return;

    connect().then(async (res) => {
      const id = res.userConnected.id;
      const sig = await discordSign.sign(id);
      if (!sig) return;

      const { publicKey, signature } = sig;
      registerDiscord.mutate({
        userAddress: connectedAddress,
        discordId: id,
        publicKey,
        signature,
        // lets the backend check with Discord that this account is really yours
        accessToken: res.accessTokenUser.access_token
      });
    });
  };

  return (
    <div className='DiscordCard'>
      <span className='p-4 text-[1.1rem] font-semibold'>Discord</span>
      <div className='discord-content'>
        {discordUser && discordRoles ? (
          <DiscordUser user={discordUser} roles={discordRoles} />
        ) : (
          <>
            <span>
              Earn bonus points by linking your Discord account (role-based).
            </span>
            {registerDiscord.isError && (
              <div className='error'>
                <FontAwesomeIcon icon={faWarning} />
                {registerDiscord.error?.message || 'An error occurred'}
              </div>
            )}
            <Button
              text='Connect to Discord'
              variant='contained'
              pending={
                discordSign.isConfirmPending || registerDiscord.isLoading
              }
              onClick={handleDiscordConnect}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DiscordCard;
