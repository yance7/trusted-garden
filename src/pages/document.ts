import '../styles/document.css';
import {initNavigation} from './navigation';
import {sceneSelection,updatePageLinks} from '../navigation';
initNavigation();
const selected=sceneSelection(new URLSearchParams(location.search));updatePageLinks(selected.view,selected.scenario);
