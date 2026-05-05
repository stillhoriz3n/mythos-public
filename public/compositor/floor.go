package main

import (
	"encoding/json"
	"math"
	"syscall/js"
)

// Frame represents a floating Minority Report panel
type Frame struct {
	ID      string  `json:"id"`
	Title   string  `json:"title"`
	Plugin  string  `json:"plugin"`
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
	Z       float64 `json:"z"`
	W       float64 `json:"w"`
	H       float64 `json:"h"`
	RotX    float64 `json:"rotX"`
	RotY    float64 `json:"rotY"`
	RotZ    float64 `json:"rotZ"`
	Scale   float64 `json:"scale"`
	Opacity float64 `json:"opacity"`
	ZOrder  int     `json:"zOrder"`
	Focused bool    `json:"focused"`
	Alive   bool    `json:"alive"`
	DriftT  float64 `json:"driftT"`
	DriftAX float64 `json:"driftAX"`
	DriftAY float64 `json:"driftAY"`
	DriftAZ float64 `json:"driftAZ"`
}

type PanelDef struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Icon  string `json:"icon"`
	Kind  string `json:"kind"`
}

var (
	frames      = make(map[string]*Frame)
	frameOrder  []string
	nextZ       = 1
	radialOpen  = false
	tick        float64
	screenW     float64 = 1200
	screenH     float64 = 800
)

var panels = []PanelDef{
	{ID: "askjarvis", Title: "AskJarvis", Icon: "J", Kind: "voice"},
	{ID: "pipedream", Title: "Pipe Dream", Icon: "P", Kind: "engineering"},
	{ID: "schedule", Title: "Schedule", Icon: "S", Kind: "calendar"},
	{ID: "email", Title: "Email", Icon: "E", Kind: "comms"},
	{ID: "fleet", Title: "Fleet", Icon: "F", Kind: "ops"},
	{ID: "music", Title: "Music", Icon: "M", Kind: "media"},
	{ID: "substrate", Title: "Substrate", Icon: "B", Kind: "data"},
	{ID: "radiant", Title: "Prime Radiant", Icon: "R", Kind: "covenant"},
}

func addFrame(_ js.Value, args []js.Value) interface{} {
	id := args[0].String()
	title := args[1].String()
	plugin := args[2].String()

	if _, exists := frames[id]; exists {
		f := frames[id]
		f.Focused = true
		f.ZOrder = nextZ
		nextZ++
		return serialize(f)
	}

	slot := len(frames)
	baseX := screenW*0.3 + float64(slot%3)*60
	baseY := screenH*0.25 + float64(slot/3)*50

	f := &Frame{
		ID:      id,
		Title:   title,
		Plugin:  plugin,
		X:       baseX,
		Y:       baseY,
		Z:       0,
		W:       420,
		H:       340,
		RotX:    (float64(slot%5) - 2) * 1.5,
		RotY:    (float64(slot%3) - 1) * 2.0,
		RotZ:    (float64(slot%7) - 3) * 0.3,
		Scale:   1.0,
		Opacity: 0,
		ZOrder:  nextZ,
		Focused: true,
		Alive:   true,
		DriftT:  float64(slot) * 1.7,
		DriftAX: 0.3 + float64(slot%3)*0.15,
		DriftAY: 0.5 + float64(slot%4)*0.2,
		DriftAZ: 0.1 + float64(slot%5)*0.05,
	}
	nextZ++

	for _, other := range frames {
		other.Focused = false
	}

	frames[id] = f
	frameOrder = append(frameOrder, id)
	return serialize(f)
}

func removeFrame(_ js.Value, args []js.Value) interface{} {
	id := args[0].String()
	if f, exists := frames[id]; exists {
		f.Alive = false
		return true
	}
	return false
}

func focusFrame(_ js.Value, args []js.Value) interface{} {
	id := args[0].String()
	for _, f := range frames {
		f.Focused = f.ID == id
	}
	if f, exists := frames[id]; exists {
		f.ZOrder = nextZ
		nextZ++
	}
	return nil
}

func moveFrame(_ js.Value, args []js.Value) interface{} {
	id := args[0].String()
	x := args[1].Float()
	y := args[2].Float()
	if f, exists := frames[id]; exists {
		f.X = x
		f.Y = y
	}
	return nil
}

func getFrames(_ js.Value, _ []js.Value) interface{} {
	result := make([]Frame, 0, len(frames))
	for _, id := range frameOrder {
		if f, exists := frames[id]; exists {
			result = append(result, *f)
		}
	}
	b, _ := json.Marshal(result)
	return string(b)
}

func getPanels(_ js.Value, _ []js.Value) interface{} {
	b, _ := json.Marshal(panels)
	return string(b)
}

func toggleRadial(_ js.Value, _ []js.Value) interface{} {
	radialOpen = !radialOpen
	return radialOpen
}

func isRadialOpen(_ js.Value, _ []js.Value) interface{} {
	return radialOpen
}

func closeRadial(_ js.Value, _ []js.Value) interface{} {
	radialOpen = false
	return nil
}

func setScreenSize(_ js.Value, args []js.Value) interface{} {
	screenW = args[0].Float()
	screenH = args[1].Float()
	return nil
}

func update(_ js.Value, args []js.Value) interface{} {
	dt := args[0].Float()
	tick += dt

	var toRemove []string
	for id, f := range frames {
		if !f.Alive {
			f.Opacity -= dt * 3
			if f.Opacity <= 0 {
				toRemove = append(toRemove, id)
			}
			continue
		}

		if f.Opacity < 1 {
			f.Opacity += dt * 2.5
			if f.Opacity > 1 {
				f.Opacity = 1
			}
		}

		t := tick + f.DriftT
		f.RotX = f.DriftAX * math.Sin(t*0.4)
		f.RotY = f.DriftAY * math.Cos(t*0.35)
		f.RotZ = f.DriftAZ * math.Sin(t*0.25)

		if !f.Focused {
			f.Z = 2 * math.Sin(t*0.3)
		} else {
			f.Z *= 0.9
		}
	}

	for _, id := range toRemove {
		delete(frames, id)
		for i, fid := range frameOrder {
			if fid == id {
				frameOrder = append(frameOrder[:i], frameOrder[i+1:]...)
				break
			}
		}
	}

	return nil
}

func serialize(f *Frame) string {
	b, _ := json.Marshal(f)
	return string(b)
}

func main() {
	c := make(map[string]interface{})
	c["addFrame"] = js.FuncOf(addFrame)
	c["removeFrame"] = js.FuncOf(removeFrame)
	c["focusFrame"] = js.FuncOf(focusFrame)
	c["moveFrame"] = js.FuncOf(moveFrame)
	c["getFrames"] = js.FuncOf(getFrames)
	c["getPanels"] = js.FuncOf(getPanels)
	c["toggleRadial"] = js.FuncOf(toggleRadial)
	c["isRadialOpen"] = js.FuncOf(isRadialOpen)
	c["closeRadial"] = js.FuncOf(closeRadial)
	c["setScreenSize"] = js.FuncOf(setScreenSize)
	c["update"] = js.FuncOf(update)

	js.Global().Set("compositor", js.ValueOf(c))
	js.Global().Call("dispatchEvent", js.Global().Get("CustomEvent").New("compositor-ready"))

	select {}
}
