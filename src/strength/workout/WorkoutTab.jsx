// Strength "Тренировка" tab: the running workout, or the programs to start one from.
import { ActiveWorkout } from "./ActiveWorkout.jsx";
import { ProgramList } from "./ProgramList.jsx";

export const WorkoutTab = (props) => (props.data.active ? <ActiveWorkout {...props} /> : <ProgramList {...props} />);
