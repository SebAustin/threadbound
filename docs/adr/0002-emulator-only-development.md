# Develop and prove everything in the emulator

No Quest headset is available. All development runs against IWER (IWSDK's browser XR emulator) in a headless managed browser, and correctness is proven by E2E: every level is solved by its stored solution and must not solve itself; input is exercised with real mouse and emulated-hand pinches. Performance is held by a design budget (draw calls, triangles, physics bodies) rather than measured fps, plus a real-device check requested from the community before submission.
