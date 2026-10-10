// Strength "Тренировка" tab: the running workout, or the programs to start one from. During a workout «‹» shows the
// programs here (list) — to look at or edit; the running one's ▶ and the workout pill lead back.
import { ActiveWorkout } from "./ActiveWorkout.jsx";
import { ProgramList } from "./ProgramList.jsx";

export const WorkoutTab = ({ list, setList, ...props }) => (props.data.active && !list
  ? <ActiveWorkout {...props} onPrograms={() => setList(true)} />
  : <ProgramList {...props} onReturn={() => setList(false)} />);
