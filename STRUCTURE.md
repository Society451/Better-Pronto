### Structure of Better Pronto

The `pronto.py` script acts as a wrapper for the official Pronto API, with documentation available [here](https://github.com/Better-Pronto/Unofficial-Pronto-API). The main component of Better Pronto is `pywebview`, a lightweight and cross-platform library that enables the creation of web-based graphical user interfaces (GUIs) in Python. 

This setup allows for locally hosted web pages that utilize a Python-to-JavaScript bridge, enabling seamless communication between Python functions and JavaScript. Consequently, we can harness the performance and flexibility of HTML and CSS for the frontend while employing Python for the backend, which manages requests via `pronto.py` and `readjson.py` for data handling. 

This data is then retrieved by the frontend HTML page running in `pywebview` and displayed accordingly:

```
+---------------------+
|   Frontend (HTML)   |
|  (PyWebview GUI)    |
+----------+----------+
           |
           | Calls JavaScript
           |
           v
+----------+----------+
|  JavaScript Bridge   |
| (Python-to-JS calls) |
+----------+----------+
           |
           | Calls Python Functions
           |
           v
+----------+----------+
|     Backend (Python) |
|   (pronto.py, readjson.py) |
+----------+----------+
           |
           | Interacts with Official Pronto API
           |
           v
+----------+----------+
|   Official Pronto   |
|        API          |
+---------------------+
```