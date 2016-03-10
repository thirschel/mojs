import h from '../h';
import t from './tweener';
import Tween from './tween';

class Timeline extends Tween {
  /*
    API method to add child tweens/timelines.
    @public
    @param {Object, Array} Tween/Timeline or an array of such.
    @returns {Object} Self.
  */
  add (...args) {
    this._pushTimelineArray(args);
    this._calcDimentions();
    return this;
  }
  /*
    API method to append the Tween/Timeline to the end of the
    timeline. Each argument is treated as a new append.
    Array of tweens is treated as a parallel sequence. 
    @public
    @param {Object, Array} Tween/Timeline to append or array of such.
    @returns {Object} Self.
  */
  append (...timeline) {
    for (var tm of timeline) {
      if (h.isArray(tm)) { this._appendTimelineArray(tm); }
      else { this._appendTimeline(tm, this._timelines.length); }
      this._calcDimentions();
    }
    return this;
  }
  /*
    Method to append Tween/Timeline array or mix of such.
    @private
    @param {Array} Array of Tweens/Timelines.
  */
  _appendTimelineArray (timelineArray) {
    var i     = timelineArray.length,
        time  = this._props.repeatTime - this._props.delay,
        len   = this._timelines.length;

    while(i--) { this._appendTimeline(timelineArray[i], len, time); }
  }
  /*
    Method to append a single timeline to the Timeline.
    @private
    @param {Object} Tween/Timline to append.
    @param {Number} Index of the append.
    @param {Number} Shift time.
  */
  _appendTimeline (timeline, index, time) {
    // if timeline is a module with timeline property then extract it
    if (timeline.timeline instanceof Timeline) { timeline = timeline.timeline; }

    var shift = (time != null) ? time : this._props.duration;
    shift    += timeline._props.shiftTime || 0;
    timeline.index = index; this._pushTimeline(timeline, shift);
  }
  /*
    PrivateMethod to push Tween/Timeline array.
    @private
    @param {Array} Array of Tweens/Timelines.
  */
  _pushTimelineArray (array) {
    for (var i = 0; i < array.length; i++) {
      var tm = array[i];
      // recursive push to handle arrays of arrays
      if ( h.isArray(tm) ) {
        this._pushTimelineArray(tm)
      } else { this._pushTimeline(tm); }
    };
  }
  /*
    Method to push a single Tween/Timeline.
    @private
    @param {Object} Tween or Timeline to push.
    @param {Number} Number of milliseconds to shift the start time
                    of the Tween/Timeline.
  */
  _pushTimeline (timeline, shift) {
    // if timeline is a module with timeline property then extract it
    if (timeline.timeline instanceof Timeline) { timeline = timeline.timeline; }
    // add self delay to the timeline
    (shift != null) && timeline._setProps({ 'shiftTime': shift });
    this._timelines.push(timeline);
    this._recalcDuration(timeline);
  }
  /*
    Method set progress on self and child Tweens/Timelines.
    @private
    @param {Number} Progress to set.
    @param {Number} Current update time.
  */
  _setProgress (p, time, isYoyo) {
    super._setProgress(p, time);
    // we need to pass self previous time to children
    // to prevent initial _wasUnknownUpdate nested waterfall
    // if not yoyo option set, pass the previous time
    // otherwise, pass previous or next time regarding yoyo period.
    var coef = ( time > this._prevTime ) ? -1 : 1;
    if ( this._props.yoyo && isYoyo ) { coef *= -1; }
    var timeToTimelines     = this._props.startTime + p*(this._props.duration),
        prevTimeToTimelines = timeToTimelines + coef,
        len = this._timelines.length;
    for (var i = 0; i < len; i++) {
      // specify the children's array update loop direction
      // if time > prevTime go from 0->length else from length->0
      // var j = ( time > this._prevTime ) ? i : (len-1) - i ;
      var j = ( timeToTimelines > prevTimeToTimelines ) ? i : (len-1) - i ;
      this._timelines[j]._update(
        timeToTimelines,
        prevTimeToTimelines,
        this._prevYoyo,
        this._onEdge
      );
    }
    this._prevYoyo = isYoyo;
  }
  /*
    Method calculate self duration based on timeline's duration.
    @private
    @param {Object} Tween or Timeline to calculate.
  */
  _recalcDuration (timeline) {
    var p             = timeline._props,
        speedCoef     = ( p.speed ) ? (1/p.speed) : 1,
        timelineTime  = speedCoef*p.repeatTime + (p.shiftTime || 0);
    this._props.duration = Math.max(timelineTime, this._props.duration);
  }
  /*
    Method calculate self duration from skretch.
    @private
  */
  _recalcTotalDuration () {
    var i = this._timelines.length;
    this._props.duration = 0;
    while(i--) { this._recalcDuration(this._timelines[i]); }
    this._calcDimentions();
  }
  
  /*
    Method set start and end times.
    @private
    @param {Number, Null} Time to start with.
  */
  _setStartTime ( time, isReset = true ) {
    super._setStartTime(time);
    this._startTimelines(this._props.startTime, isReset);
  }
  /*
    Method calculate self duration based on timeline's duration.
    @private
    @param {Number, Null} Time to start with.
  */
  _startTimelines (time, isReset = true) {
    var i = this._timelines.length,
        p = this._props,
        timeline;
    ( time == null) && (time = this._props.startTime);
    while(i--) {
      timeline = this._timelines[i];
      timeline._setStartTime(time, isReset);
      // if from _subPlay and _prevTime is set
      if ( !isReset && timeline._prevTime != null ) {
        timeline._prevTime = timeline._normPrevTimeForward();
      }
    }
  }
  /*
    Method do declare defaults by this._defaults object
    @private
  */
  _declareDefaults () {
    // if duration was passed on initialization stage, warn user and reset it.
    if ( this.o.duration != null ) {
      h.error(`Duration can not be declared on Timeline, but "${this.o.duration}" is. You probably want to use Tween instead.`);
      this.o.duration = 0;
    }
    super._declareDefaults();
    // remove default 
    this._defaults.duration = 0;
    this._defaults.nameBase = 'Timeline';
  }

  constructor ( o = {} ) { super(o); }
  /*
    Method to declare some vars.
    @private
  */
  _vars () {
    this._timelines = [];
    super._vars();
  }
}

export default Timeline;
