var caretTimer;
var caretVisible = true;
var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];
var cursorVisible = true;
var snapToPadding = 6;
var hitTargetPadding = 6;
var selectedObject = null;
var currentLink = null;
var movingObject = false;
var originalClick;
var shift = false;
var ctrl = false;
var epsilon = 'ε';
var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
var greekLetterNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];
var c;
class Link {
    constructor(a, b) {
        this.nodeA = a;
        this.nodeB = b;
        this.text = '';
        this.lineAngleAdjust = 0;
        this.parallelPart = 0.5;
        this.perpendicularPart = 0;
    }
    getAnchorPoint() {
        var dx = this.nodeB.x - this.nodeA.x;
        var dy = this.nodeB.y - this.nodeA.y;
        var scale = Math.sqrt(dx * dx + dy * dy);
        return {
            'x': this.nodeA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
            'y': this.nodeA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
        };
    }
    setAnchorPoint(x, y) {
        var dx = this.nodeB.x - this.nodeA.x;
        var dy = this.nodeB.y - this.nodeA.y;
        var scale = Math.sqrt(dx * dx + dy * dy);
        this.parallelPart = (dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (scale * scale);
        this.perpendicularPart = (dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / scale;
        if (this.parallelPart > 0 && this.parallelPart < 1 && Math.abs(this.perpendicularPart) < snapToPadding) {
            this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
            this.perpendicularPart = 0;
        }
    }
    getEndPointsAndCircle() {
        if (this.perpendicularPart == 0) {
            var midX = (this.nodeA.x + this.nodeB.x) / 2;
            var midY = (this.nodeA.y + this.nodeB.y) / 2;
            var start = this.nodeA.closestPointOnCircle(midX, midY);
            var end = this.nodeB.closestPointOnCircle(midX, midY);
            return {
                'hasCircle': false,
                'startX': start.x,
                'startY': start.y,
                'endX': end.x,
                'endY': end.y,
            };
        }
        var anchor = this.getAnchorPoint();
        var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, this.nodeB.x, this.nodeB.y, anchor.x, anchor.y);
        var isReversed = (this.perpendicularPart > 0);
        var reverseScale = isReversed ? 1 : -1;
        var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x) - reverseScale * nodeRadius / circle.radius;
        var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x) + reverseScale * nodeRadius / circle.radius;
        var startX = circle.x + circle.radius * Math.cos(startAngle);
        var startY = circle.y + circle.radius * Math.sin(startAngle);
        var endX = circle.x + circle.radius * Math.cos(endAngle);
        var endY = circle.y + circle.radius * Math.sin(endAngle);
        return {
            'hasCircle': true,
            'startX': startX,
            'startY': startY,
            'endX': endX,
            'endY': endY,
            'startAngle': startAngle,
            'endAngle': endAngle,
            'circleX': circle.x,
            'circleY': circle.y,
            'circleRadius': circle.radius,
            'reverseScale': reverseScale,
            'isReversed': isReversed,
        };
    }
    draw() {
        var stuff = this.getEndPointsAndCircle();
        c.beginPath();
        if (stuff.hasCircle) {
            c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, stuff.isReversed);
        } else {
            c.moveTo(stuff.startX, stuff.startY);
            c.lineTo(stuff.endX, stuff.endY);
        }
        c.stroke();
        if (stuff.hasCircle) {
            drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
        } else {
            drawArrow(stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
        }
        if (stuff.hasCircle) {
            var startAngle = stuff.startAngle;
            var endAngle = stuff.endAngle;
            if (endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
            var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
            var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
            drawText(this.text, textX, textY, textAngle, selectedObject == this);
        } else {
            var textX = (stuff.startX + stuff.endX) / 2;
            var textY = (stuff.startY + stuff.endY) / 2;
            var textAngle = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY);
            drawText(this.text, textX, textY, textAngle + this.lineAngleAdjust, selectedObject == this);
        }
    }
    containsPoint(x, y) {
        var stuff = this.getEndPointsAndCircle();
        if (stuff.hasCircle) {
            var dx = x - stuff.circleX;
            var dy = y - stuff.circleY;
            var distance = Math.sqrt(dx * dx + dy * dy) - stuff.circleRadius;
            if (Math.abs(distance) < hitTargetPadding) {
                var angle = Math.atan2(dy, dx);
                var startAngle = stuff.startAngle;
                var endAngle = stuff.endAngle;
                if (stuff.isReversed) {
                    var temp = startAngle;
                    startAngle = endAngle;
                    endAngle = temp;
                }
                if (endAngle < startAngle) {
                    endAngle += Math.PI * 2;
                }
                if (angle < startAngle) {
                    angle += Math.PI * 2;
                } else if (angle > endAngle) {
                    angle -= Math.PI * 2;
                }
                return (angle > startAngle && angle < endAngle);
            }
        } else {
            var dx = stuff.endX - stuff.startX;
            var dy = stuff.endY - stuff.startY;
            var length = Math.sqrt(dx * dx + dy * dy);
            var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
            var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
            return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
        }
        return false;
    }
    getAlpha() {
        var temp = [];
        this.text.replace(" ", "").trim().split(',').forEach(x => {
            if (!temp.includes(x)) {
                temp.push(x);
            }
        });
        return temp;
    }
}
class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.mouseOffsetX = 0;
        this.mouseOffsetY = 0;
        this.isAcceptState = false;
        this.isInitialState = false;
        this.text = '';
    }
    getLinks() {
        let nodeLinks = [];
        for (let i = 0; i < links.length; i++) {
            if (links[i] instanceof SelfLink) {
                if (links[i].node === this) {
                    nodeLinks.push(links[i]);
                }
            }
            else {
                if (links[i].nodeA === this) {
                    nodeLinks.push(links[i]);
                }
            }
        }
        return nodeLinks;
    }
    getIndex() {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].text === this.text) {
                return i;
            }
        }
    }
    setMouseStart(x, y) {
        this.mouseOffsetX = this.x - x;
        this.mouseOffsetY = this.y - y;
    }
    setAnchorPoint(x, y) {
        this.x = x + this.mouseOffsetX;
        this.y = y + this.mouseOffsetY;
    }
    draw() {
        c.beginPath();
        c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
        c.stroke();
        drawText(this.text, this.x, this.y, null, selectedObject == this);
        if (this.isAcceptState) {
            c.beginPath();
            c.arc(this.x, this.y, nodeRadius - 6, 0, 2 * Math.PI, false);
            c.stroke();
        }
    }
    closestPointOnCircle(x, y) {
        var dx = x - this.x;
        var dy = y - this.y;
        var scale = Math.sqrt(dx * dx + dy * dy);
        return {
            'x': this.x + dx * nodeRadius / scale,
            'y': this.y + dy * nodeRadius / scale,
        };
    }
    containsPoint(x, y) {
        return (x - this.x) * (x - this.x) + (y - this.y) * (y - this.y) < nodeRadius * nodeRadius;
    }
}
class SelfLink {
    constructor(node, mouse) {
        this.node = node;
        this.anchorAngle = 0;
        this.mouseOffsetAngle = 0;
        this.text = '';
        if (mouse) {
            this.setAnchorPoint(mouse.x, mouse.y);
        }
    }
    setMouseStart(x, y) {
        this.mouseOffsetAngle = this.anchorAngle - Math.atan2(y - this.node.y, x - this.node.x);
    }
    setAnchorPoint(x, y) {
        this.anchorAngle = Math.atan2(y - this.node.y, x - this.node.x) + this.mouseOffsetAngle;
        var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
        if (Math.abs(this.anchorAngle - snap) < 0.1) {
            this.anchorAngle = snap;
        }
        if (this.anchorAngle < -Math.PI) {
            this.anchorAngle += 2 * Math.PI;
        }
        if (this.anchorAngle > Math.PI) {
            this.anchorAngle -= 2 * Math.PI;
        }
    }
    getEndPointsAndCircle() {
        var circleX = this.node.x + 1.5 * nodeRadius * Math.cos(this.anchorAngle);
        var circleY = this.node.y + 1.5 * nodeRadius * Math.sin(this.anchorAngle);
        var circleRadius = 0.75 * nodeRadius;
        var startAngle = this.anchorAngle - Math.PI * 0.8;
        var endAngle = this.anchorAngle + Math.PI * 0.8;
        var startX = circleX + circleRadius * Math.cos(startAngle);
        var startY = circleY + circleRadius * Math.sin(startAngle);
        var endX = circleX + circleRadius * Math.cos(endAngle);
        var endY = circleY + circleRadius * Math.sin(endAngle);
        return {
            'hasCircle': true,
            'startX': startX,
            'startY': startY,
            'endX': endX,
            'endY': endY,
            'startAngle': startAngle,
            'endAngle': endAngle,
            'circleX': circleX,
            'circleY': circleY,
            'circleRadius': circleRadius
        };
    }
    draw() {
        var stuff = this.getEndPointsAndCircle();
        c.beginPath();
        c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, false);
        c.stroke();
        var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
        var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
        drawText(this.text, textX, textY, this.anchorAngle, selectedObject == this);
        drawArrow(stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
    }
    containsPoint(x, y) {
        var stuff = this.getEndPointsAndCircle();
        var dx = x - stuff.circleX;
        var dy = y - stuff.circleY;
        var distance = Math.sqrt(dx * dx + dy * dy) - stuff.circleRadius;
        return (Math.abs(distance) < hitTargetPadding);
    }
    getAlpha() {
        var temp = [];
        this.text.split(',').forEach(x => {
            if (!temp.includes(x)) {
                temp.push(x);
            }
        });
        return temp;
    }
}
class StartLink {
    constructor(node, start) {
        this.node = node;
        this.deltaX = 0;
        this.deltaY = 0;
        this.text = '';
        if (start) {
            this.setAnchorPoint(start.x, start.y);
        }
    }
    setAnchorPoint(x, y) {
        this.deltaX = x - this.node.x;
        this.deltaY = y - this.node.y;
        if (Math.abs(this.deltaX) < snapToPadding) {
            this.deltaX = 0;
        }
        if (Math.abs(this.deltaY) < snapToPadding) {
            this.deltaY = 0;
        }
    }
    getEndPoints() {
        var startX = this.node.x + this.deltaX;
        var startY = this.node.y + this.deltaY;
        var end = this.node.closestPointOnCircle(startX, startY);
        return {
            'startX': startX,
            'startY': startY,
            'endX': end.x,
            'endY': end.y,
        };
    }
    draw() {
        var stuff = this.getEndPoints();
        c.beginPath();
        c.moveTo(stuff.startX, stuff.startY);
        c.lineTo(stuff.endX, stuff.endY);
        c.stroke();
        var textAngle = Math.atan2(stuff.startY - stuff.endY, stuff.startX - stuff.endX);
        drawText(this.text, stuff.startX, stuff.startY, textAngle, selectedObject == this);
        drawArrow(stuff.endX, stuff.endY, Math.atan2(-this.deltaY, -this.deltaX));
    }
    containsPoint(x, y) {
        var stuff = this.getEndPoints();
        var dx = stuff.endX - stuff.startX;
        var dy = stuff.endY - stuff.startY;
        var length = Math.sqrt(dx * dx + dy * dy);
        var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
        var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
        return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
    }
    getAlpha() {
        var temp = [];
        this.text.split(',').forEach(x => {
            if (!temp.includes(x)) {
                temp.push(x);
            }
        });
        return temp;
    }
}
class TemporaryLink {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }
    draw() {
        c.beginPath();
        c.moveTo(this.to.x, this.to.y);
        c.lineTo(this.from.x, this.from.y);
        c.stroke();
        drawArrow(this.to.x, this.to.y, Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x));
    }
}

function drawArrow(x, y, angle) {
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
    c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
    c.fill();
}
function canvasHasFocus() {
    return (document.activeElement || document.body) == document.body;
}
function drawText(originalText, x, y, angleOrNull, isSelected) {
    text = convertLatexShortcuts(originalText);
    c.font = '20px "Times New Roman", serif';
    var width = c.measureText(text).width;
    x -= width / 2;
    if (angleOrNull != null) {
        var cos = Math.cos(angleOrNull);
        var sin = Math.sin(angleOrNull);
        var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
        var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
        var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
        x += cornerPointX - sin * slide;
        y += cornerPointY + cos * slide;
    }
    if ('advancedFillText' in c) {
        c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
    } else {
        x = Math.round(x);
        y = Math.round(y);
        c.fillText(text, x, y + 6);
        if (isSelected && caretVisible && canvasHasFocus() && document.hasFocus() && !(selectedObject instanceof Node)) {
            x += width;
            c.beginPath();
            c.moveTo(x, y - 10);
            c.lineTo(x, y + 10);
            c.stroke();
        }
    }
}
function resetCaret() {
    clearInterval(caretTimer);
    caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
    caretVisible = true;
}
function drawUsing() {
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.rect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "white";
    c.fill();
    c.save();
    c.translate(0.5, 0.5);
    for (var i = 0; i < nodes.length; i++) {
        c.lineWidth = nodes[i].isInitialState ? 3 : 1;
        c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : 'black';
        //c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : nodes[i].isInitialState ? 'green' : 'black';
        nodes[i].draw();
    }
    for (var i = 0; i < links.length; i++) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = (links[i] == selectedObject) ? 'blue' : 'black';
        links[i].draw();
    }
    if (currentLink != null) {
        c.lineWidth = 1;
        c.fillStyle = c.strokeStyle = 'black';
        currentLink.draw();
    }
    c.restore();
}
function draw() {
    drawUsing();
}
function selectObject(x, y) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].containsPoint(x, y)) {
            return nodes[i];
        }
    }
    for (var i = 0; i < links.length; i++) {
        if (links[i].containsPoint(x, y)) {
            return links[i];
        }
    }
    return null;
}
function snapNode(node) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] == node) {
            continue;
        }
        if (Math.abs(node.x - nodes[i].x) < snapToPadding) {
            node.x = nodes[i].x;
        }
        if (Math.abs(node.y - nodes[i].y) < snapToPadding) {
            node.y = nodes[i].y;
        }
    }
}
function crossBrowserKey(e) {
    e = e || window.event;
    return e.which || e.keyCode;
}
function crossBrowserElementPos(e) {
    e = e || window.event;
    var obj = e.target || e.srcElement;
    var x = 0,
        y = 0;
    while (obj.offsetParent) {
        x += obj.offsetLeft;
        y += obj.offsetTop;
        obj = obj.offsetParent;
    }
    return {
        'x': x,
        'y': y
    };
}
function crossBrowserMousePos(e) {
    e = e || window.event;
    return {
        'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
        'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
    };
}
function crossBrowserRelativeMousePos(e) {
    var element = crossBrowserElementPos(e);
    var mouse = crossBrowserMousePos(e);
    return {
        'x': mouse.x - element.x,
        'y': mouse.y - element.y
    };
}
function det(a, b, c, d, e, f, g, h, i) {
    return a * e * i + b * f * g + c * d * h - a * f * h - b * d * i - c * e * g;
}
function circleFromThreePoints(x1, y1, x2, y2, x3, y3) {
    var a = det(x1, y1, 1, x2, y2, 1, x3, y3, 1);
    var bx = -det(x1 * x1 + y1 * y1, y1, 1, x2 * x2 + y2 * y2, y2, 1, x3 * x3 + y3 * y3, y3, 1);
    var by = det(x1 * x1 + y1 * y1, x1, 1, x2 * x2 + y2 * y2, x2, 1, x3 * x3 + y3 * y3, x3, 1);
    var c = -det(x1 * x1 + y1 * y1, x1, y1, x2 * x2 + y2 * y2, x2, y2, x3 * x3 + y3 * y3, x3, y3);
    return {
        'x': -bx / (2 * a),
        'y': -by / (2 * a),
        'radius': Math.sqrt(bx * bx + by * by - 4 * a * c) / (2 * Math.abs(a))
    };
}
function convertLatexShortcuts(text) {
    for (var i = 0; i < greekLetterNames.length; i++) {
        var name = greekLetterNames[i];
        text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
        text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
    }
    for (var i = 0; i < 10; i++) {
        text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
    }
    return text;
}

window.onload = function () {
    canvas = document.getElementById('canvas');
    c = canvas.getContext('2d');
    draw();
    canvas.onmousedown = function (e) {
        var mouse = crossBrowserRelativeMousePos(e);
        selectedObject = selectObject(mouse.x, mouse.y);
        movingObject = false;
        originalClick = mouse;
        if (selectedObject != null) {
            if (shift && selectedObject instanceof Node) {
                currentLink = new SelfLink(selectedObject, mouse);
            } else {
                movingObject = true;
                deltaMouseX = deltaMouseY = 0;
                if (selectedObject.setMouseStart) {
                    selectedObject.setMouseStart(mouse.x, mouse.y);
                }
            }
            resetCaret();
        } else if (shift) {
            currentLink = new TemporaryLink(mouse, mouse);
        }
        draw();
        if (canvasHasFocus()) {
            return false;
        } else {
            resetCaret();
            return true;
        }
    };
    canvas.ondblclick = function (e) {
        var mouse = crossBrowserRelativeMousePos(e);
        selectedObject = selectObject(mouse.x, mouse.y);
        if (selectedObject == null) {
            selectedObject = new Node(mouse.x, mouse.y);
            selectedObject.text = "q" + nodes.length;
            nodes.push(selectedObject);
            resetCaret();
            draw();
        } else if (selectedObject instanceof Node) {
            if (ctrl) {
                if (hasInıtialState()) {
                    if (selectedObject.isInitialState) {
                        selectedObject.isInitialState = false;
                    }
                    else {
                        alert("There can only be one initial state");
                    }
                }
                else {
                    selectedObject.isInitialState = !selectedObject.isInitialState;
                }
            }
            else {
                selectedObject.isAcceptState = !selectedObject.isAcceptState;
            }
            draw();
        }
    };
    canvas.onmousemove = function (e) {
        var mouse = crossBrowserRelativeMousePos(e);
        if (currentLink != null) {
            var targetNode = selectObject(mouse.x, mouse.y);
            if (!(targetNode instanceof Node)) {
                targetNode = null;
            }
            if (selectedObject == null) {
                if (targetNode != null) {
                    currentLink = new StartLink(targetNode, originalClick);
                } else {
                    currentLink = new TemporaryLink(originalClick, mouse);
                }
            } else {
                if (targetNode == selectedObject) {
                    currentLink = new SelfLink(selectedObject, mouse);
                } else if (targetNode != null) {
                    currentLink = new Link(selectedObject, targetNode);
                } else {
                    currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
                }
            }
            draw();
        }
        if (movingObject) {
            selectedObject.setAnchorPoint(mouse.x, mouse.y);
            if (selectedObject instanceof Node) {
                snapNode(selectedObject);
            }
            draw();
        }
    };
    canvas.onmouseup = function (e) {
        movingObject = false;
        if (currentLink != null) {
            if (!(currentLink instanceof TemporaryLink)) {
                selectedObject = currentLink;
                links.push(currentLink);
                resetCaret();
            }
            currentLink = null;
            draw();
        }
    };
    document.getElementById("convertToDfa").addEventListener("click", function () {
        document.getElementById("output").value = nfaToDfa();
    });
}
document.onkeydown = function (e) {
    var key = crossBrowserKey(e);
    if (key == 16) {
        shift = true;
    }
    else if (key == 17) {
        ctrl = true;
    }
    else if (!canvasHasFocus()) {
        return true;
    }
    else if (key == 8) {
        if (selectedObject != null && 'text' in selectedObject && !(selectedObject instanceof Node)) {
            selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
            resetCaret();
            draw();
        }
        return false;
    }
    else if (key == 46) {
        if (selectedObject != null) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i] == selectedObject) {
                    nodes.splice(i--, 1);
                }
            }
            for (var i = 0; i < links.length; i++) {
                if (links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
                    links.splice(i--, 1);
                }
            }
            selectedObject = null;
            draw();
        }
    }
};
document.onkeyup = function (e) {
    var key = crossBrowserKey(e);
    if (key == 16) {
        shift = false;
    }
    else if (key == 17) {
        ctrl = false;
    }
};
document.onkeypress = function (e) {
    var key = crossBrowserKey(e);
    if (!canvasHasFocus()) {
        return true;
    } else if (key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject && !(selectedObject instanceof Node)) {
        selectedObject.text += String.fromCharCode(key);
        resetCaret();
        draw();
        return false;
    } else if (key == 8) {
        return false;
    }
};
function eClosureNode(node) {
    var closureArr = [];
    closureArr.push(node);
    node.getLinks().forEach(link => {
        if (link.text === "\\epsilon" && !closureArr.includes(link.nodeB)) {
            closureArr.push(link.nodeB);
            eClosureNode(link.nodeB).forEach(x => {
                if (!closureArr.includes(x)) {
                    closureArr.push(x);
                }
            });
        }
    });
    closureArr.sort(function (a, b) { return (a.getIndex() > b.getIndex()); });
    return closureArr;
}
function eClosureNodeArray(nodes) {
    var closureArr = [];
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
        var closureNodes = eClosureNode(nodes[nodeIndex]);
        for (let closureNodeIndex = 0; closureNodeIndex < closureNodes.length; closureNodeIndex++) {
            if (!closureArr.includes(closureNodes[closureNodeIndex])) {
                closureArr.push(closureNodes[closureNodeIndex]);
            }
        }
    }
    closureArr.sort(function (a, b) { return (a.getIndex() > b.getIndex()); });
    return closureArr;
}
function moveNfaSet(nodesSet, value) {
    let moves = [];
    nodesSet.forEach(node => {
        moves = moves.concat(moveNfaNode(node, value));
    });
    moves = moves.filter((item, index) => moves.indexOf(item) == index);
    moves.sort(function (a, b) { return (a.getIndex() > b.getIndex()); });
    return moves;
}
function moveNfaNode(node, value) {
    let moves = [];
    node.getLinks().forEach(link => {
        if (link instanceof SelfLink) {
            if (link.getAlpha().includes(value) && !moves.includes(link.node)) {
                moves.push(link.node);
            }
        }
        else {
            if (link.getAlpha().includes(value) && !moves.includes(link.nodeB)) {
                moves.push(link.nodeB);
            }
        }


    });
    moves.sort(function (a, b) { return (a.getIndex() > b.getIndex()); });
    return moves;
}
function nodeArrayToString(nodesTemp) {
    if (nodesTemp.length === 0) {
        return "{}";
    }
    let temp = "{" + nodesTemp[0].text;
    for (let i = 1; i < nodesTemp.length; i++) {
        temp += ", " + nodesTemp[i].text;
    }
    return temp + "}";
}
function linksIsNamed() {
    var returnTemp = true;
    links.forEach(link => {
        if (link.text == "") {
            returnTemp = false;
        }
    });
    return returnTemp;
}
function nodesHasConnection() {
    return links.length >= nodes.length - 1;
}
function getNfaAlphabet() {
    let alpha = [];
    links.forEach(link => {
        link.text.split(',').forEach(x => {
            if (!alpha.includes(x)) {
                alpha.push(x);
            }
        });
    });
    alpha = alpha.filter((item, index) => alpha.indexOf(item) == index);
    alpha.sort();
    return alpha;
}
function getAcceptedNodes() {
    let acceptedNodes = [];
    nodes.forEach(node => {
        if (node.isAcceptState) {
            acceptedNodes.push(node);
        }
    });
    return acceptedNodes;
}
function nfaToDfa() {
    if (!linksIsNamed()) {
        alert("All links not named");
        return "";
    }
    if (!nodesHasConnection()) {
        alert("All nodes have not connection");
        return "";
    }
    if (!hasInıtialState()) {
        alert("Nfa have not initial node");
        return "";
    }
    if (getAcceptedNodes().length == 0) {
        alert("Nfa have not accepted node");
        return "";
    }
    var nfaAlpha = getNfaAlphabet();
    var counter = 0;
    var sets = new Map();
    var initialNode = getInıtialNode();
    sets.set(eClosureNode(initialNode), alphabet[counter++]);
    var output = '';
    var test;
    while (true) {
        test = [];
        output = 'ε-Closure(' + initialNode.text + ') = ' + nodeArrayToString(eClosureNode(initialNode)) + ' = A \n';
        var doRepeat = false;
        var tempMap = new Map();
        sets.forEach((values, keys) => {
            tempMap.set(keys, values);
        });
        tempMap.forEach((values, keys) => {
            output += "Process " + values + "(" + nodeArrayToString(keys) + ")\n";
            nfaAlpha.forEach(alphaKey => {
                var MoveNfaNodeToKey = moveNfaSet(keys, alphaKey);
                var ClosureMoveNfaNodeToKey = eClosureNodeArray(MoveNfaNodeToKey);
                if (!has(sets, ClosureMoveNfaNodeToKey)) {
                    var setName = MoveNfaNodeToKey.length == 0 ? 'Ø' : alphabet[counter++];
                    sets.set(MoveNfaNodeToKey, setName);
                    output += "      MoveDFA(" + values + "," + alphaKey + ")=ε-Closure(MoveNFA(" + values + "," + alphaKey + ")) = ε-Closure(" + nodeArrayToString(keys) + ") = " + nodeArrayToString(ClosureMoveNfaNodeToKey) + " = " + setName + "\n";
                    doRepeat = true;
                    test.push(values + "->" + setName + "=" + alphaKey);
                }
                else {
                    var setName = get(sets, MoveNfaNodeToKey);
                    output += "      MoveDFA(" + values + "," + alphaKey + ")=ε-Closure(MoveNFA(" + values + "," + alphaKey + ")) = ε-Closure(" + nodeArrayToString(keys) + ") = " + nodeArrayToString(ClosureMoveNfaNodeToKey) + " = " + setName + "\n";
                    test.push(values + "->" + setName + "=" + alphaKey);
                }
            });
            output += "\n";
        });
        if (!doRepeat) {
            break;
        }
    }
    var acceptedNodes = getAcceptedNodes();
    var acceptedSets = [];
    sets.forEach((values, keys) => {
        keys.forEach(x => {
            if (acceptedNodes.includes(x)) {
                if (!acceptedSets.includes(values)) {
                    acceptedSets.push(values);
                }
            }
        });
    });
    output += "Final States = {" + acceptedSets + "}\nConnections\n";
    output += test.join('\n');
    return output;
}
function has(map, value) {
    var returnTemp = false;
    map.forEach((values, keys) => {
        if (nodeArrayToString(keys) == nodeArrayToString(value)) {
            returnTemp = true;
        }
    });
    return returnTemp;
}
function get(map, value) {
    var returnTemp;
    map.forEach((values, keys) => {
        if (nodeArrayToString(keys) == nodeArrayToString(value)) {
            returnTemp = values;
        }
    });
    return returnTemp;
}
function replace(map, value, newValue) {
    var tempMap = new Map();
    map.forEach((values, keys) => {
        if (nodeArrayToString(keys) == nodeArrayToString(value)) {
            tempMap.set(keys, true);
        }
        else {
            tempMap.set(keys, false);
        }
    });
    return tempMap;
}
function remove(map, value) {
    var tempMap = new Map();
    map.forEach((values, keys) => {
        if (nodeArrayToString(keys) != nodeArrayToString(value)) {
            tempMap.set(keys, values);
        }
    });
    return tempMap;
}
function hasInıtialState() {
    var returnTemp = false;
    nodes.forEach(node => {
        if (node.isInitialState) {
            returnTemp = true;
        }
    });
    return returnTemp;
}
function getInıtialNode() {
    var returnTemp;
    nodes.forEach(node => {
        if (node.isInitialState) {
            returnTemp = node;
        }
    });
    return returnTemp;
}