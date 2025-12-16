# heart-attack

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/YuanRuQian/heart-attack)



* Computes **Hofstadter Q(n)** iteratively (safe, non-recursive)
* Builds a **3D “puffed” heart** using **Option B (curvature ballooning)**
* Renders it as a **3D point cloud**
* Uses **only a few thousand points** (enough to clearly see the first full heart)


## 1️⃣ Concept we’ll implement

We embed the sequence as:

```
x = Q(n)
y = Q(n+1)
z = |Q(n+1) - 2Q(n) + Q(n-1)|   // local curvature = “puff”
```

Then normalize everything and render it in 3D.

