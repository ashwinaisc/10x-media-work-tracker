import ManagerWorkspace from './manager-workspace';
import {requireChatGPTUser} from './chatgpt-auth';

export default async function Home(){
  await requireChatGPTUser('/');
  return <ManagerWorkspace/>;
}
